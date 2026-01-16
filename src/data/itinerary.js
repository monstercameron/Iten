import rawItineraryData from './rawItinerary.json';

// Export budget and trip metadata
export const TRIP_BUDGET = rawItineraryData.budget || { total: 0, currency: 'USD' };
export const TRIP_NAME = rawItineraryData.tripName || 'Travel Itinerary';
export const TRAVELERS = rawItineraryData.travelers || [];

const STATUS_MAPPING = {
  'BOOKED': 'BOOKED',
  'PLANNED': 'PLANNED',
  'PLANNED_WARN': 'PLANNED_WARN',
  'BUFFER': 'BUFFER',
  'TO_BOOK': 'TO_BOOK',
  'WEEKEND_SKI': 'WEEKEND_SKI',
  'OPTIONAL': 'OPTIONAL',
  'IF_CONDITIONAL': 'IF_CONDITIONAL',
  'UNSET': 'UNSET'
};

/**
 * Helper: Get all dates between start and end (inclusive)
 * Uses string manipulation to avoid timezone issues
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  
  // Parse the date strings manually to avoid timezone issues
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  // Create dates at noon to avoid DST issues
  const current = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
  const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
  
  while (current <= end) {
    // Format as YYYY-MM-DD
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Parse raw itinerary JSON and organize by days
 */
function parseItinerary(data = rawItineraryData) {
  const dayMap = new Map();

  // Helper to create or get a day entry
  function getOrCreateDay(date, trip, segment) {
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        dateKey: date,
        dateDisplay: formatDate(date),
        timezone: segment?.tzLabel || segment?.tzFrom || segment?.tz || 'UTC',
        tz: segment?.tz || null, // Region: US, PH, JP
        region: trip?.region || null,
        summary: trip.name,
        location: extractLocation(segment),
        travel: [],
        shelter: {},
        meals: [],
        activities: [],
        metadata: {
          hasTravel: false,
          locationFlags: [],
          estimatedCost: 0,
          costCurrencies: new Set(),
          unbootedCount: 0,
          hasUnbooked: false,
          isContinuationDay: false
        }
      });
    }
    return dayMap.get(date);
  }

  // Process all segments
  data.trips.forEach(trip => {
    trip.segments.forEach(segment => {
      const startDate = segment.date;
      const endDate = segment.dateEnd || segment.date;
      const segmentType = segment.type.toLowerCase();
      
      // Determine which dates this segment should appear on
      // ALWAYS expand to all dates in range - show every date on timeline
      let segmentDates = getDateRange(startDate, endDate);
      
      segmentDates.forEach((date, dateIndex) => {
        const day = getOrCreateDay(date, trip, segment);
        
        // Mark intermediate flight dates (crossing dateline)
        if (segmentType === 'flight' && segmentDates.length > 1) {
          if (dateIndex > 0 && dateIndex < segmentDates.length - 1) {
            // This is an intermediate date (e.g., Jan 31 for SFO→MNL)
            day.isInFlight = true;
            day.inFlightDetails = {
              route: segment.route,
              flight: segment.flight || segment.details,
              note: 'Crossing International Date Line'
            };
          }
        }
        
        // Update day info
        if (segment.tz || segment.tzFrom) {
          day.timezone = segment.tz || segment.tzFrom;
        }
        if (extractLocation(segment) && !day.location) {
          day.location = extractLocation(segment);
        }

      const segmentData = {
        id: segment.id,
        type: segment.type,
        route: segment.route || null,
        time: formatTime(segment.timeStart, segment.timeEnd),
        duration: segment.duration || null,
        status: STATUS_MAPPING[segment.status] || 'UNSET',
        details: segment.details,
        airline: segment.airline || extractAirline(segment.details),
        flight: segment.flight || extractFlight(segment.details),
        aircraft: segment.aircraft || null,
        cabinClass: segment.cabinClass || null,
        departureAirport: segment.departureAirport || null,
        arrivalAirport: segment.arrivalAirport || null,
        location: segment.location,
        name: segment.details,
        estimatedCost: segment.estimatedCost || null,
        currency: segment.currency || null,
        isMultiDay: segmentDates.length > 1,
        dayOfSpan: dateIndex + 1,
        totalDays: segmentDates.length
      };

      // Track metadata for the day (only on first date for costs to avoid double counting)
      if (['flight', 'travel', 'transit', 'bus', 'airport'].includes(segment.type.toLowerCase())) {
        day.metadata.hasTravel = true;
      }
      
      // Track unbooked/TO_BOOK items (only on first date)
      if (segment.status === 'TO_BOOK' && dateIndex === 0) {
        day.metadata.unbootedCount += 1;
        day.metadata.hasUnbooked = true;
      }
      
      // Track costs only on the first day of a multi-day segment
      if (segment.estimatedCost && dateIndex === 0) {
        day.metadata.estimatedCost += segment.estimatedCost;
        day.metadata.costCurrencies.add(segment.currency);
      }
      
      if (segment.location) {
        const locationKey = extractLocationKey(segment.location);
        if (locationKey && !day.metadata.locationFlags.includes(locationKey)) {
          day.metadata.locationFlags.push(locationKey);
        }
      }

      // Categorize segment by type
      switch (segment.type.toLowerCase()) {
        case 'flight':
        case 'travel':
        case 'transit':
        case 'bus':
        case 'airport':
          // For flights: show on departure date (dateIndex 0) and arrival date (dateIndex 1 for cross-dateline)
          // Mark if this is arrival vs departure for display
          const isArrivalDate = dateIndex === segmentDates.length - 1 && segmentDates.length > 1;
          const isDepartureDate = dateIndex === 0;
          
          if (isDepartureDate || isArrivalDate) {
            const flightData = {
              ...segmentData,
              isDeparture: isDepartureDate,
              isArrival: isArrivalDate,
              crossesDateline: segmentDates.length > 1 && segment.type.toLowerCase() === 'flight'
            };
            
            if (segment.type.toLowerCase() === 'flight' && isDepartureDate) {
              flightData.backupPlan = generateBackupPlan(segment);
            }
            day.travel.push(flightData);
          }
          break;

        case 'stay':
        case 'check-in':
          // For accommodations:
          // - dateEnd represents checkout DATE (morning you leave)
          // - Only show shelter for nights you're actually sleeping there
          // - If dateEnd exists, don't show shelter on the checkout date itself
          const isCheckoutDay = segment.dateEnd && dateIndex === segmentDates.length - 1;
          
          // Skip applying shelter on checkout day - you're leaving, not staying
          if (isCheckoutDay) {
            // Don't set shelter for checkout day - let another segment fill it
            break;
          }
          
          // Apply shelter to this day (nights you're sleeping there)
          if (!day.shelter.name) {
            if (segment.shelter) {
              day.shelter = {
                name: segment.shelter.name,
                address: segment.shelter.address,
                type: segment.shelter.type || null,
                notes: segment.shelter.notes || null,
                host: segment.shelter.host || null,
                checkIn: dateIndex === 0 ? (segment.timeStart || segment.shelter.checkIn || null) : null,
                checkOut: segment.shelter.checkOut || null,
                isMultiDayStay: segmentDates.length > 1,
                dayOfStay: dateIndex + 1,
                totalStayDays: segmentDates.length - 1, // Subtract 1 because last day is checkout
                estimatedCost: segment.estimatedCost || null,
                currency: segment.currency || null
              };
            } else {
              day.shelter = {
                name: segment.location || segment.details,
                address: extractAddress(segment.details),
                checkIn: dateIndex === 0 ? (segment.timeStart || null) : null,
                checkOut: null,
                notes: segment.note || null,
                isMultiDayStay: segmentDates.length > 1,
                dayOfStay: dateIndex + 1,
                totalStayDays: segmentDates.length - 1,
                estimatedCost: segment.estimatedCost || null,
                currency: segment.currency || null
              };
            }
          }
          break;

        case 'meal':
          if (dateIndex === 0) {
            day.meals.push({
              id: segment.id,
              type: segment.details,
              location: segment.location,
              time: formatTime(segment.timeStart, segment.timeEnd),
              details: segment.details
            });
          }
          break;

        case 'activity':
        case 'explore':
        case 'prep':
        case 'ski setup':
          if (dateIndex === 0) {
            day.activities.push({
              id: segment.id,
              name: segment.details,
              location: segment.location,
              time: formatTime(segment.timeStart, segment.timeEnd),
              description: segment.details,
              type: segment.type
            });
          }
          break;

        case 'layover':
          if (dateIndex === 0) {
            day.activities.push({
              id: segment.id,
              name: `Layover: ${segment.details}`,
              location: segment.location,
              time: formatTime(segment.timeStart, segment.timeEnd),
              description: segment.details,
              type: 'layover'
            });
          }
          break;

        default:
          // Default to activities if it has meaningful content (only on first day)
          if (segment.details && dateIndex === 0) {
            day.activities.push({
              id: segment.id,
              name: segment.details,
              location: segment.location,
              time: formatTime(segment.timeStart, segment.timeEnd),
              description: segment.details,
              type: segment.type
            });
          }
      }
      }); // end segmentDates.forEach
    });
  });

  // Convert map to sorted array
  return Array.from(dayMap.values()).sort((a, b) => {
    return new Date(a.dateKey) - new Date(b.dateKey);
  }).map(day => ({
    ...day,
    metadata: {
      ...day.metadata,
      costCurrencies: Array.from(day.metadata.costCurrencies)
    }
  }));
}

/**
 * Generate backup plan for flights
 */
function generateBackupPlan(segment) {
  if (!segment.status || segment.status === 'BOOKED' || segment.status === 'TO_BOOK') {
    return {
      trigger: 'Flight delay (>2 hrs) or cancellation',
      options: [
        {
          id: `bp-${segment.id}-1`,
          priority: 1,
          title: 'Next available flight same route',
          description: 'Rebook on next available flight to same destination',
          status: 'TO_BOOK',
          contact: 'Airline customer service / online rebooking'
        },
        {
          id: `bp-${segment.id}-2`,
          priority: 2,
          title: 'Alternate route via different hub',
          description: 'Consider booking via alternate routing if available',
          status: 'TO_BOOK',
          contact: 'Airline customer service'
        },
        {
          id: `bp-${segment.id}-3`,
          priority: 3,
          title: 'Ground transportation alternative',
          description: 'Use ground transport if delay < 24hrs and destination reachable',
          status: 'TO_BOOK',
          contact: 'Local transportation providers'
        }
      ]
    };
  }
  return null;
}

/**
 * Format time range
 */
function formatTime(start, end) {
  if (!start) return null;
  if (end && end !== start) {
    return `${start} → ${end}`;
  }
  return start;
}

/**
 * Format date string to readable format
 * Parses YYYY-MM-DD manually to avoid timezone issues
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at noon to avoid DST issues
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Extract airline code from flight details
 */
function extractAirline(details) {
  if (!details) return null;
  const match = details.match(/([A-Z]{2})(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract flight number from flight details
 */
function extractFlight(details) {
  if (!details) return null;
  const match = details.match(/([A-Z]{2})(\d+)/);
  return match ? match[0] : null;
}

/**
 * Extract address from details string
 */
function extractAddress(details) {
  if (!details) return null;
  // Look for pattern: street address — city info
  const match = details.match(/—\s*(.+?)(?:\s*—|$)/);
  return match ? match[1].trim() : null;
}

/**
 * Extract location from segment
 */
function extractLocation(segment) {
  if (segment.location) return segment.location;
  if (segment.route) return segment.route.split('→')[1]?.trim() || null;
  return null;
}

/**
 * Extract location key for flagging (airport code or city name)
 */
function extractLocationKey(location) {
  if (!location) return null;
  // Extract airport/city codes (3-letter codes)
  const match = location.match(/\b([A-Z]{3})\b/);
  if (match) return match[1];
  // Extract city names
  if (location.includes('Tokyo')) return '🇯🇵 Tokyo';
  if (location.includes('Joetsu')) return '⛷️ Joetsu';
  if (location.includes('Myoko')) return '⛷️ Myoko';
  if (location.includes('Manila') || location.includes('MNL')) return '🇵🇭 Manila';
  if (location.includes('Bacolod') || location.includes('BCD')) return '🇵🇭 Bacolod';
  if (location.includes('San Francisco') || location.includes('SFO')) return '🇺🇸 San Francisco';
  if (location.includes('Denver') || location.includes('DEN')) return '🇺🇸 Denver';
  if (location.includes('Miami') || location.includes('FLL')) return '🇺🇸 Miami';
  return location;
}

/**
 * Parse and export itinerary
 */
export const ITINERARY_DAYS = parseItinerary();

/**
 * Get segments by type for a given day
 */
export function getSegmentsByType(day, type) {
  const typeKey = type.toLowerCase();
  switch (typeKey) {
    case 'travel':
      return day.travel;
    case 'shelter':
      return Object.keys(day.shelter).length > 0 ? [day.shelter] : [];
    case 'meals':
      return day.meals;
    case 'activities':
      return day.activities;
    default:
      return [];
  }
}

export default ITINERARY_DAYS;
