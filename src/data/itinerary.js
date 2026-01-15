import rawItineraryData from './rawItinerary.json';

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
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Parse raw itinerary JSON and organize by days
 */
function parseItinerary(data = rawItineraryData) {
  const dayMap = new Map();
  
  // First pass: find min and max dates across all trips
  let minDate = null;
  let maxDate = null;
  
  data.trips.forEach(trip => {
    trip.segments.forEach(segment => {
      const startDate = segment.date;
      const endDate = segment.dateEnd || segment.date;
      
      if (!minDate || startDate < minDate) minDate = startDate;
      if (!maxDate || endDate > maxDate) maxDate = endDate;
    });
  });
  
  // Create entries for ALL dates in the range
  if (minDate && maxDate) {
    const allDates = getDateRange(minDate, maxDate);
    allDates.forEach(date => {
      dayMap.set(date, {
        dateKey: date,
        dateDisplay: formatDate(date),
        timezone: 'UTC',
        summary: 'In Transit / Continuation',
        location: null,
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
          isContinuationDay: true
        }
      });
    });
  }

  // Second pass: Group all segments by date (including multi-day spans)
  data.trips.forEach(trip => {
    trip.segments.forEach(segment => {
      const startDate = segment.date;
      const endDate = segment.dateEnd || segment.date;
      const segmentDates = getDateRange(startDate, endDate);
      
      segmentDates.forEach((date, dateIndex) => {
        if (!dayMap.has(date)) {
          dayMap.set(date, {
            dateKey: date,
            dateDisplay: formatDate(date),
            timezone: segment.tz || segment.tzFrom || 'UTC',
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
              hasUnbooked: false
            }
          });
        }
        
        const day = dayMap.get(date);
        
        // Update day metadata from trip/segment info (not a blank continuation day)
        day.metadata.isContinuationDay = false;
        if (!day.summary || day.summary === 'In Transit / Continuation') {
          day.summary = trip.name;
        }
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
          // Add backup plan structure if it's a critical flight (only on first day)
          if (segment.type.toLowerCase() === 'flight' && dateIndex === 0) {
            segmentData.backupPlan = generateBackupPlan(segment);
            day.travel.push(segmentData);
          } else if (dateIndex === 0) {
            day.travel.push(segmentData);
          }
          break;

        case 'stay':
        case 'check-in':
          // Apply shelter to this day
          if (!day.shelter.name) {
            if (segment.shelter) {
              day.shelter = {
                name: segment.shelter.name,
                address: segment.shelter.address,
                type: segment.shelter.type || null,
                notes: segment.shelter.notes || null,
                checkIn: dateIndex === 0 ? (segment.timeStart || null) : null,
                checkOut: dateIndex === segmentDates.length - 1 ? (segment.timeEnd || null) : null,
                isMultiDayStay: segmentDates.length > 1,
                dayOfStay: dateIndex + 1,
                totalStayDays: segmentDates.length
              };
            } else {
              day.shelter = {
                name: segment.location || segment.details,
                address: extractAddress(segment.details),
                checkIn: dateIndex === 0 ? (segment.timeStart || null) : null,
                checkOut: dateIndex === segmentDates.length - 1 ? (segment.timeEnd || null) : null,
                notes: segment.note || null,
                isMultiDayStay: segmentDates.length > 1,
                dayOfStay: dateIndex + 1,
                totalStayDays: segmentDates.length
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
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
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
