/**
 * @fileoverview Itinerary data parsing and transformation module
 * 
 * Parses raw JSON itinerary data and transforms it into a structured
 * day-by-day format suitable for rendering in the UI.
 * 
 * @module data/itinerary
 */

import rawItineraryData from './rawItinerary.json';

// =============================================================================
// CONSTANTS
// =============================================================================

/** @constant {number} MAX_DATE_RANGE_ITERATIONS - Safety limit for date iteration */
const MAX_DATE_RANGE_ITERATIONS = 365;

/**
 * @constant {Object} STATUS_CODE_MAPPING - Maps status strings to normalized codes
 */
const STATUS_CODE_MAPPING = {
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
 * @constant {Array<string>} TRAVEL_SEGMENT_TYPES - Segment types that count as travel
 */
const TRAVEL_SEGMENT_TYPES = ['flight', 'travel', 'transit', 'bus', 'airport'];

/**
 * @constant {Array<string>} ACTIVITY_SEGMENT_TYPES - Segment types that count as activities
 */
const ACTIVITY_SEGMENT_TYPES = ['activity', 'explore', 'prep', 'ski setup', 'activities'];

// =============================================================================
// EXPORTED CONSTANTS (Default values from raw data)
// =============================================================================

/** @constant {Object} TRIP_BUDGET - Budget configuration from raw data */
export const TRIP_BUDGET = rawItineraryData.budget || { total: 0, currency: 'USD' };

/** @constant {string} TRIP_NAME - Trip name from raw data */
export const TRIP_NAME = rawItineraryData.tripName || 'Travel Itinerary';

/** @constant {Array} TRAVELERS - List of travelers from raw data */
export const TRAVELERS = rawItineraryData.travelers || [];

// =============================================================================
// PURE HELPER FUNCTIONS - String/Data Extraction
// =============================================================================

/**
 * Extracts airline code from flight details string.
 * 
 * @pure
 * @param {string|null} detailsString - Flight details string
 * @returns {string|null} Two-letter airline code or null
 * 
 * @example
 * extractAirlineCodeFromDetails('PR103 Manila') // Returns 'PR'
 */
function extractAirlineCodeFromDetails(detailsString) {
  if (!detailsString) return null;
  const airlineMatch = detailsString.match(/([A-Z]{2})(\d+)/);
  return airlineMatch ? airlineMatch[1] : null;
}

/**
 * Extracts flight number from flight details string.
 * 
 * @pure
 * @param {string|null} detailsString - Flight details string
 * @returns {string|null} Full flight number or null
 * 
 * @example
 * extractFlightNumberFromDetails('PR103 Manila') // Returns 'PR103'
 */
function extractFlightNumberFromDetails(detailsString) {
  if (!detailsString) return null;
  const flightMatch = detailsString.match(/([A-Z]{2})(\d+)/);
  return flightMatch ? flightMatch[0] : null;
}

/**
 * Extracts address from details string.
 * 
 * @pure
 * @param {string|null} detailsString - Details string containing address
 * @returns {string|null} Extracted address or null
 */
function extractAddressFromDetails(detailsString) {
  if (!detailsString) return null;
  const addressMatch = detailsString.match(/—\s*(.+?)(?:\s*—|$)/);
  return addressMatch ? addressMatch[1].trim() : null;
}

/**
 * Extracts location from segment data.
 * 
 * @pure
 * @param {Object} segmentData - Segment object
 * @returns {string|null} Location string or null
 */
function extractLocationFromSegment(segmentData) {
  if (segmentData.location) return segmentData.location;
  if (segmentData.route) {
    const routeParts = segmentData.route.split('→');
    return routeParts[1]?.trim() || null;
  }
  return null;
}

/**
 * Extracts location key for flagging (airport code or city name).
 * 
 * @pure
 * @param {string|null} locationString - Location string
 * @returns {string|null} Location key for display
 */
function extractLocationKeyForFlag(locationString) {
  if (!locationString) return null;
  
  // Extract airport/city codes (3-letter codes)
  const codeMatch = locationString.match(/\b([A-Z]{3})\b/);
  if (codeMatch) return codeMatch[1];
  
  // Map city names to flag representations
  const cityFlagMap = {
    'Tokyo': '🇯🇵 Tokyo',
    'Joetsu': '⛷️ Joetsu',
    'Myoko': '⛷️ Myoko',
    'Manila': '🇵🇭 Manila',
    'MNL': '🇵🇭 Manila',
    'Bacolod': '🇵🇭 Bacolod',
    'BCD': '🇵🇭 Bacolod',
    'San Francisco': '🇺🇸 San Francisco',
    'SFO': '🇺🇸 San Francisco',
    'Denver': '🇺🇸 Denver',
    'DEN': '🇺🇸 Denver',
    'Miami': '🇺🇸 Miami',
    'FLL': '🇺🇸 Miami'
  };
  
  for (const [cityName, flagDisplay] of Object.entries(cityFlagMap)) {
    if (locationString.includes(cityName)) {
      return flagDisplay;
    }
  }
  
  return locationString;
}

// =============================================================================
// PURE HELPER FUNCTIONS - Date/Time Formatting
// =============================================================================

/**
 * Formats a time range string.
 * 
 * @pure
 * @param {string|null} startTime - Start time string
 * @param {string|null} endTime - End time string
 * @returns {string|null} Formatted time range or null
 */
function formatTimeRange(startTime, endTime) {
  if (!startTime) return null;
  if (endTime && endTime !== startTime) {
    return `${startTime} → ${endTime}`;
  }
  return startTime;
}

/**
 * Formats date string to readable format.
 * Parses YYYY-MM-DD manually to avoid timezone issues.
 * 
 * @pure
 * @param {string} dateIsoString - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateIsoString) {
  const [year, month, day] = dateIsoString.split('-').map(Number);
  // Create date at noon to avoid DST issues
  const dateObject = new Date(year, month - 1, day, 12, 0, 0);
  const formatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return dateObject.toLocaleDateString('en-US', formatOptions);
}

/**
 * Gets all dates between start and end (inclusive).
 * Uses string manipulation to avoid timezone issues.
 * 
 * @pure
 * @param {string} startDateString - Start date (YYYY-MM-DD)
 * @param {string} endDateString - End date (YYYY-MM-DD)
 * @returns {Array<string>} Array of ISO date strings
 */
function getDateRangeBetween(startDateString, endDateString) {
  const dateRangeArray = [];
  
  // Parse the date strings manually to avoid timezone issues
  const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
  
  // Create dates at noon to avoid DST issues
  const currentIterationDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
  const rangeEndDate = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
  
  let iterationCount = 0;
  
  // CRITICAL PATH: Iterate through date range with safety limit
  while (currentIterationDate <= rangeEndDate && iterationCount < MAX_DATE_RANGE_ITERATIONS) {
    const yearPart = currentIterationDate.getFullYear();
    const monthPart = String(currentIterationDate.getMonth() + 1).padStart(2, '0');
    const dayPart = String(currentIterationDate.getDate()).padStart(2, '0');
    dateRangeArray.push(`${yearPart}-${monthPart}-${dayPart}`);
    currentIterationDate.setDate(currentIterationDate.getDate() + 1);
    iterationCount++;
  }
  
  return dateRangeArray;
}

// =============================================================================
// PURE HELPER FUNCTIONS - Data Transformation
// =============================================================================

/**
 * Gets trip metadata from any data source.
 * 
 * @pure
 * @param {Object} itineraryData - Itinerary data object
 * @returns {Object} Trip metadata object
 */
export function getTripMeta(itineraryData = rawItineraryData) {
  return {
    tripName: itineraryData.tripName || 'Travel Itinerary',
    budget: itineraryData.budget || { total: 0, currency: 'USD' },
    travelers: itineraryData.travelers || []
  };
}

/**
 * Generates backup plan for flight segments.
 * 
 * @pure
 * @param {Object} flightSegment - Flight segment data
 * @returns {Object|null} Backup plan object or null
 */
function generateFlightBackupPlan(flightSegment) {
  if (!flightSegment.status || flightSegment.status === 'BOOKED' || flightSegment.status === 'TO_BOOK') {
    return {
      trigger: 'Flight delay (>2 hrs) or cancellation',
      options: [
        {
          id: `bp-${flightSegment.id}-1`,
          priority: 1,
          title: 'Next available flight same route',
          description: 'Rebook on next available flight to same destination',
          status: 'TO_BOOK',
          contact: 'Airline customer service / online rebooking'
        },
        {
          id: `bp-${flightSegment.id}-2`,
          priority: 2,
          title: 'Alternate route via different hub',
          description: 'Consider booking via alternate routing if available',
          status: 'TO_BOOK',
          contact: 'Airline customer service'
        },
        {
          id: `bp-${flightSegment.id}-3`,
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
 * Creates an empty day entry structure.
 * 
 * @pure
 * @param {string} dateKey - ISO date string
 * @param {Object} tripData - Parent trip data
 * @param {Object} segmentData - Segment data for timezone info
 * @returns {Object} Empty day entry
 */
function createEmptyDayEntry(dateKey, tripData, segmentData) {
  return {
    dateKey: dateKey,
    dateDisplay: formatDateForDisplay(dateKey),
    timezone: segmentData?.tzLabel || segmentData?.tzFrom || segmentData?.tz || 'UTC',
    tz: segmentData?.tz || null,
    region: tripData?.region || null,
    summary: tripData.name,
    location: extractLocationFromSegment(segmentData),
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
  };
}

/**
 * Creates a standardized segment data object.
 * 
 * @pure
 * @param {Object} segmentData - Raw segment data
 * @param {number} dateIndexInRange - Index within multi-day range
 * @param {number} totalDatesInRange - Total dates in segment range
 * @returns {Object} Standardized segment data
 */
function createStandardizedSegmentData(segmentData, dateIndexInRange, totalDatesInRange) {
  return {
    id: segmentData.id,
    type: segmentData.type,
    route: segmentData.route || null,
    time: formatTimeRange(segmentData.timeStart, segmentData.timeEnd),
    duration: segmentData.duration || null,
    status: STATUS_CODE_MAPPING[segmentData.status] || 'UNSET',
    details: segmentData.details,
    airline: segmentData.airline || extractAirlineCodeFromDetails(segmentData.details),
    flight: segmentData.flight || extractFlightNumberFromDetails(segmentData.details),
    aircraft: segmentData.aircraft || null,
    cabinClass: segmentData.cabinClass || null,
    departureAirport: segmentData.departureAirport || null,
    arrivalAirport: segmentData.arrivalAirport || null,
    location: segmentData.location,
    name: segmentData.details,
    estimatedCost: segmentData.estimatedCost || null,
    currency: segmentData.currency || null,
    isMultiDay: totalDatesInRange > 1,
    dayOfSpan: dateIndexInRange + 1,
    totalDays: totalDatesInRange
  };
}

// =============================================================================
// MAIN PARSING FUNCTION
// =============================================================================

/**
 * Parses raw itinerary JSON and organizes by days.
 * This is the main transformation function that converts raw JSON
 * into a structured day-by-day itinerary format.
 * 
 * @param {Object} itineraryData - Raw itinerary data object
 * @returns {Array<Object>} Array of day objects sorted by date
 */
function parseItineraryFromData(itineraryData = rawItineraryData) {
  const dayEntriesMap = new Map();

  /**
   * Gets or creates a day entry for the given date.
   * @param {string} dateKey - ISO date string
   * @param {Object} tripData - Parent trip data
   * @param {Object} segmentData - Segment data
   * @returns {Object} Day entry
   */
  function getOrCreateDayEntry(dateKey, tripData, segmentData) {
    if (!dayEntriesMap.has(dateKey)) {
      dayEntriesMap.set(dateKey, createEmptyDayEntry(dateKey, tripData, segmentData));
    }
    return dayEntriesMap.get(dateKey);
  }

  // CRITICAL PATH: Process all trips and their segments
  for (const tripData of itineraryData.trips) {
    for (const segmentData of tripData.segments) {
      const segmentStartDate = segmentData.date;
      const segmentEndDate = segmentData.dateEnd || segmentData.date;
      const segmentTypeLowercase = segmentData.type.toLowerCase();
      
      // Get all dates this segment spans
      const segmentDateRange = getDateRangeBetween(segmentStartDate, segmentEndDate);
      
      // Process each date in the segment's range
      for (let dateIndexInRange = 0; dateIndexInRange < segmentDateRange.length; dateIndexInRange++) {
        const currentDateKey = segmentDateRange[dateIndexInRange];
        const dayEntry = getOrCreateDayEntry(currentDateKey, tripData, segmentData);
        
        // Mark intermediate flight dates (crossing dateline)
        if (segmentTypeLowercase === 'flight' && segmentDateRange.length > 1) {
          if (dateIndexInRange > 0 && dateIndexInRange < segmentDateRange.length - 1) {
            dayEntry.isInFlight = true;
            dayEntry.inFlightDetails = {
              route: segmentData.route,
              flight: segmentData.flight || segmentData.details,
              note: 'Crossing International Date Line'
            };
          }
        }
        
        // Update day timezone and location info
        if (segmentData.tz || segmentData.tzFrom) {
          dayEntry.timezone = segmentData.tz || segmentData.tzFrom;
        }
        if (extractLocationFromSegment(segmentData) && !dayEntry.location) {
          dayEntry.location = extractLocationFromSegment(segmentData);
        }

        const standardizedSegment = createStandardizedSegmentData(
          segmentData,
          dateIndexInRange,
          segmentDateRange.length
        );

        // Update day metadata
        updateDayMetadata(dayEntry, segmentData, segmentTypeLowercase, dateIndexInRange);

        // CRITICAL PATH: Categorize segment by type
        processSegmentByType(
          dayEntry,
          segmentData,
          standardizedSegment,
          segmentTypeLowercase,
          segmentDateRange,
          dateIndexInRange
        );
      }
    }
  }

  // Convert map to sorted array and finalize metadata
  return finalizeDayEntries(dayEntriesMap);
}

/**
 * Updates day metadata based on segment data.
 * 
 * @param {Object} dayEntry - Day entry to update
 * @param {Object} segmentData - Segment data
 * @param {string} segmentType - Lowercase segment type
 * @param {number} dateIndex - Index in date range
 */
function updateDayMetadata(dayEntry, segmentData, segmentType, dateIndex) {
  // Track travel segments
  if (TRAVEL_SEGMENT_TYPES.includes(segmentType)) {
    dayEntry.metadata.hasTravel = true;
  }
  
  // Track unbooked items (only on first date)
  if (segmentData.status === 'TO_BOOK' && dateIndex === 0) {
    dayEntry.metadata.unbootedCount += 1;
    dayEntry.metadata.hasUnbooked = true;
  }
  
  // Track costs only on the first day of a multi-day segment
  if (segmentData.estimatedCost && dateIndex === 0) {
    dayEntry.metadata.estimatedCost += segmentData.estimatedCost;
    dayEntry.metadata.costCurrencies.add(segmentData.currency);
  }
  
  // Track location flags
  if (segmentData.location) {
    const locationFlagKey = extractLocationKeyForFlag(segmentData.location);
    if (locationFlagKey && !dayEntry.metadata.locationFlags.includes(locationFlagKey)) {
      dayEntry.metadata.locationFlags.push(locationFlagKey);
    }
  }
}

/**
 * Processes a segment and adds it to the appropriate day category.
 * 
 * @param {Object} dayEntry - Day entry to update
 * @param {Object} segmentData - Raw segment data
 * @param {Object} standardizedSegment - Standardized segment data
 * @param {string} segmentType - Lowercase segment type
 * @param {Array<string>} segmentDateRange - Array of dates in segment range
 * @param {number} dateIndex - Index in date range
 */
function processSegmentByType(dayEntry, segmentData, standardizedSegment, segmentType, segmentDateRange, dateIndex) {
  const isFirstDateInRange = dateIndex === 0;
  const isLastDateInRange = dateIndex === segmentDateRange.length - 1;
  const isMultiDaySegment = segmentDateRange.length > 1;

  switch (segmentType) {
    case 'flight':
    case 'travel':
    case 'transit':
    case 'bus':
    case 'airport':
      processTravelSegment(dayEntry, segmentData, standardizedSegment, segmentType, isFirstDateInRange, isLastDateInRange, isMultiDaySegment);
      break;

    case 'stay':
    case 'check-in':
      processShelterSegment(dayEntry, segmentData, segmentDateRange, dateIndex);
      break;

    case 'meal':
      if (isFirstDateInRange) {
        processMealSegment(dayEntry, segmentData);
      }
      break;

    case 'activity':
    case 'explore':
    case 'prep':
    case 'ski setup':
    case 'activities':
      if (isFirstDateInRange) {
        processActivitySegment(dayEntry, segmentData);
      }
      break;

    case 'layover':
      if (isFirstDateInRange) {
        processLayoverSegment(dayEntry, segmentData);
      }
      break;

    default:
      // Default to activities if it has meaningful content
      if (segmentData.details && isFirstDateInRange) {
        processDefaultSegment(dayEntry, segmentData);
      }
  }
}

/**
 * Processes travel segment (flight, bus, etc.)
 */
function processTravelSegment(dayEntry, segmentData, standardizedSegment, segmentType, isDepartureDate, isArrivalDate, crossesDateline) {
  // Show on departure date and arrival date for multi-day travel
  if (isDepartureDate || (crossesDateline && isArrivalDate)) {
    const travelEntryData = {
      ...standardizedSegment,
      isDeparture: isDepartureDate,
      isArrival: !isDepartureDate && isArrivalDate,
      crossesDateline: crossesDateline && segmentType === 'flight'
    };
    
    if (segmentType === 'flight' && isDepartureDate) {
      travelEntryData.backupPlan = generateFlightBackupPlan(segmentData);
    }
    
    dayEntry.travel.push(travelEntryData);
  }
}

/**
 * Processes shelter/stay segment.
 */
function processShelterSegment(dayEntry, segmentData, segmentDateRange, dateIndex) {
  const isCheckoutDay = segmentData.dateEnd && dateIndex === segmentDateRange.length - 1;
  
  // Skip shelter on checkout day - you're leaving, not staying
  if (isCheckoutDay) return;
  
  // Only set shelter if not already set
  if (dayEntry.shelter.name) return;
  
  const isFirstNight = dateIndex === 0;
  const totalStayNights = segmentDateRange.length - 1; // Last day is checkout
  
  if (segmentData.shelter) {
    dayEntry.shelter = {
      name: segmentData.shelter.name,
      address: segmentData.shelter.address,
      type: segmentData.shelter.type || null,
      notes: segmentData.shelter.notes || null,
      host: segmentData.shelter.host || null,
      checkIn: isFirstNight ? (segmentData.timeStart || segmentData.shelter.checkIn || null) : null,
      checkOut: segmentData.shelter.checkOut || null,
      isMultiDayStay: segmentDateRange.length > 1,
      dayOfStay: dateIndex + 1,
      totalStayDays: totalStayNights,
      estimatedCost: segmentData.estimatedCost || null,
      currency: segmentData.currency || null,
      coordinates: segmentData.shelter.coordinates || null
    };
  } else {
    dayEntry.shelter = {
      name: segmentData.location || segmentData.details,
      address: extractAddressFromDetails(segmentData.details),
      checkIn: isFirstNight ? (segmentData.timeStart || null) : null,
      checkOut: null,
      notes: segmentData.note || null,
      isMultiDayStay: segmentDateRange.length > 1,
      dayOfStay: dateIndex + 1,
      totalStayDays: totalStayNights,
      estimatedCost: segmentData.estimatedCost || null,
      currency: segmentData.currency || null,
      coordinates: null
    };
  }
}

/**
 * Processes meal segment.
 */
function processMealSegment(dayEntry, segmentData) {
  dayEntry.meals.push({
    id: segmentData.id,
    type: segmentData.details,
    location: segmentData.location,
    time: formatTimeRange(segmentData.timeStart, segmentData.timeEnd),
    details: segmentData.details
  });
}

/**
 * Processes activity segment.
 */
function processActivitySegment(dayEntry, segmentData) {
  // Check if segment has rich activities array
  if (segmentData.activities && Array.isArray(segmentData.activities)) {
    for (const activityItem of segmentData.activities) {
      dayEntry.activities.push({
        id: `${segmentData.id}-${activityItem.name}`,
        name: activityItem.name,
        location: activityItem.location || segmentData.location,
        time: formatTimeRange(activityItem.timeStart, activityItem.timeEnd),
        timeStart: activityItem.timeStart,
        timeEnd: activityItem.timeEnd,
        description: activityItem.notes || activityItem.name,
        type: activityItem.category || segmentData.type,
        icon: activityItem.icon,
        priority: activityItem.priority,
        category: activityItem.category,
        estimatedCost: activityItem.estimatedCost,
        currency: activityItem.currency,
        notes: activityItem.notes,
        coordinates: activityItem.coordinates || null
      });
    }
  } else {
    dayEntry.activities.push({
      id: segmentData.id,
      name: segmentData.details,
      location: segmentData.location,
      time: formatTimeRange(segmentData.timeStart, segmentData.timeEnd),
      description: segmentData.details,
      type: segmentData.type
    });
  }
}

/**
 * Processes layover segment.
 */
function processLayoverSegment(dayEntry, segmentData) {
  dayEntry.activities.push({
    id: segmentData.id,
    name: `Layover: ${segmentData.details}`,
    location: segmentData.location,
    time: formatTimeRange(segmentData.timeStart, segmentData.timeEnd),
    description: segmentData.details,
    type: 'layover'
  });
}

/**
 * Processes default/unknown segment type.
 */
function processDefaultSegment(dayEntry, segmentData) {
  dayEntry.activities.push({
    id: segmentData.id,
    name: segmentData.details,
    location: segmentData.location,
    time: formatTimeRange(segmentData.timeStart, segmentData.timeEnd),
    description: segmentData.details,
    type: segmentData.type
  });
}

/**
 * Finalizes day entries by converting map to sorted array.
 * 
 * @param {Map} dayEntriesMap - Map of date keys to day entries
 * @returns {Array<Object>} Sorted array of day entries
 */
function finalizeDayEntries(dayEntriesMap) {
  return Array.from(dayEntriesMap.values())
    .sort((dayA, dayB) => new Date(dayA.dateKey) - new Date(dayB.dateKey))
    .map(dayEntry => ({
      ...dayEntry,
      metadata: {
        ...dayEntry.metadata,
        costCurrencies: Array.from(dayEntry.metadata.costCurrencies)
      }
    }));
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Pre-parsed itinerary days from raw data (default export).
 * @constant {Array<Object>}
 */
export const ITINERARY_DAYS = parseItineraryFromData();

/**
 * Parses itinerary from any data source (for IndexedDB integration).
 * Call this function with IndexedDB data to get parsed days.
 * 
 * @param {Object} itineraryData - Itinerary data object
 * @returns {Array<Object>} Array of parsed day objects
 */
export function parseItineraryData(itineraryData) {
  return parseItineraryFromData(itineraryData);
}

/**
 * Gets segments by type for a given day.
 * 
 * @param {Object} dayEntry - Day object
 * @param {string} segmentType - Type of segment to retrieve
 * @returns {Array<Object>} Array of matching segments
 */
export function getSegmentsByType(dayEntry, segmentType) {
  const normalizedType = segmentType.toLowerCase();
  
  switch (normalizedType) {
    case 'travel':
      return dayEntry.travel;
    case 'shelter':
      return Object.keys(dayEntry.shelter).length > 0 ? [dayEntry.shelter] : [];
    case 'meals':
      return dayEntry.meals;
    case 'activities':
      return dayEntry.activities;
    default:
      return [];
  }
}

export default ITINERARY_DAYS;
