/**
 * @fileoverview IndexedDB persistence layer for Travel Itinerary App
 * 
 * Provides browser-based storage for trip data, user activities, and settings.
 * This module handles all database operations including initialization, CRUD
 * operations, and data import/export.
 * 
 * ERROR HANDLING PATTERN:
 * =======================
 * All async functions return Go-style [value, error] tuples:
 * - Success: [value, null]
 * - Failure: [null, Error]
 * 
 * Callers must check error immediately after each function call:
 *   const [result, err] = await someFunction();
 *   if (err) return [null, err];
 * 
 * @module db/indexedDB
 * 
 * DATA STRUCTURE:
 * ===============
 * 
 * tripMeta (single record):
 *   { id: 'main', tripName, budget: { total, currency }, travelers: [] }
 * 
 * trips (keyed by trip name):
 *   { name, region, segments: [...] }
 *   - Each segment contains: id, date, dateEnd?, type, details, shelter?, activities?, etc.
 * 
 * userActivities (keyed by date):
 *   { date: 'YYYY-MM-DD', items: [{ id, name, time, location, ... }] }
 *   - User-added activities that don't exist in original JSON
 * 
 * deletedActivities (keyed by date):
 *   { date: 'YYYY-MM-DD', ids: ['seg-001-activity-1', ...] }
 *   - IDs of original activities user has deleted
 * 
 * settings:
 *   { key: 'initialized', value: true, timestamp }
 * 
 * @typedef {[T, null] | [null, Error]} Result<T> - Go-style result tuple
 */

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

/** @constant {string} DATABASE_NAME - Name of the IndexedDB database */
const DATABASE_NAME = 'TravelItineraryDB';

/** @constant {number} DATABASE_VERSION - Current schema version (increment on schema changes) */
const DATABASE_VERSION = 2;

/** @constant {number} MAX_DATE_RANGE_ITERATIONS - Safety limit for date range loops */
const MAX_DATE_RANGE_ITERATIONS = 365;

/**
 * @constant {Object} STORE_NAMES - Object store names for IndexedDB
 * @property {string} TRIP_META - Store for trip metadata (name, budget, travelers)
 * @property {string} TRIPS - Store for trip data with segments
 * @property {string} USER_ACTIVITIES - Store for user-added activities by date
 * @property {string} DELETED_ACTIVITIES - Store for soft-deleted activity IDs by date
 * @property {string} SETTINGS - Store for app settings
 */
const STORE_NAMES = {
  TRIP_META: 'tripMeta',
  TRIPS: 'trips',
  USER_ACTIVITIES: 'userActivities',
  DELETED_ACTIVITIES: 'deletedActivities',
  SETTINGS: 'settings'
};

// =============================================================================
// MODULE STATE
// =============================================================================

/**
 * @type {IDBDatabase|null}
 * Cached database connection (singleton pattern)
 */
let databaseConnection = null;

// =============================================================================
// GO-STYLE ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Wraps a Promise to return Go-style [value, error] tuple.
 * @template T
 * @param {Promise<T>} promise - Promise to wrap
 * @returns {Promise<[T, null] | [null, Error]>} Go-style result tuple
 */
async function wrapAsync(promise) {
  const result = await promise.then(
    (value) => [value, null],
    (error) => [null, error instanceof Error ? error : new Error(String(error))]
  );
  return result;
}

/**
 * Creates an error with a prefixed message for context.
 * @param {string} context - Function or operation context
 * @param {Error} originalError - The original error
 * @returns {Error} New error with context
 */
function wrapError(context, originalError) {
  const wrappedError = new Error(`${context}: ${originalError.message}`);
  wrappedError.cause = originalError;
  return wrappedError;
}

// =============================================================================
// PURE HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts all unique dates from trip segments, including date ranges.
 * 
 * @pure
 * @param {Array<Object>} tripsArray - Array of trip objects with segments
 * @returns {Set<string>} Set of ISO date strings (YYYY-MM-DD)
 */
function extractAllDatesFromTrips(tripsArray) {
  const uniqueDates = new Set();
  
  for (const trip of tripsArray) {
    const segments = trip.segments || [];
    
    for (const segment of segments) {
      if (segment.date) uniqueDates.add(segment.date);
      
      if (segment.dateEnd && segment.date) {
        const rangeStartDate = new Date(segment.date);
        const rangeEndDate = new Date(segment.dateEnd);
        
        if (rangeEndDate >= rangeStartDate) {
          const currentDate = new Date(rangeStartDate);
          let iterationCount = 0;
          
          // CRITICAL PATH: Iterate through date range with safety limit
          while (currentDate <= rangeEndDate && iterationCount < MAX_DATE_RANGE_ITERATIONS) {
            uniqueDates.add(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
            iterationCount++;
          }
        }
      }
    }
  }
  
  return uniqueDates;
}

/**
 * Creates a standardized trip metadata object from JSON data.
 * @pure
 * @param {Object} jsonData - Raw JSON data from import
 * @returns {Object} Normalized trip metadata object
 */
function createTripMetadataRecord(jsonData) {
  return {
    id: 'main',
    tripName: jsonData.tripName || 'My Trip',
    budget: jsonData.budget || { total: 0, currency: 'USD' },
    travelers: jsonData.travelers || []
  };
}

/**
 * Creates a standardized trip record from raw trip data.
 * @pure
 * @param {Object} tripData - Raw trip data from JSON
 * @returns {Object} Normalized trip record
 */
function createTripRecord(tripData) {
  return {
    name: tripData.name,
    region: tripData.region,
    segments: tripData.segments || []
  };
}

/**
 * Aggregates records by date into a lookup object.
 * @pure
 * @param {Array<Object>} records - Array of records with date and items/ids
 * @param {string} propertyName - Property to extract ('items' or 'ids')
 * @returns {Object} Object keyed by date with values being the property arrays
 */
function aggregateRecordsByDate(records, propertyName) {
  const aggregatedResult = {};
  
  for (const record of records) {
    const propertyValue = record[propertyName];
    if (propertyValue && propertyValue.length > 0) {
      aggregatedResult[record.date] = propertyValue;
    }
  }
  
  return aggregatedResult;
}

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

/**
 * Initializes the IndexedDB database connection.
 * Creates the database and object stores if they don't exist.
 * Uses a singleton pattern to reuse existing connections.
 * 
 * @async
 * @returns {Promise<[IDBDatabase, null] | [null, Error]>} Go-style result tuple
 */
export function initDB() {
  return new Promise((resolve) => {
    // CRITICAL PATH: Return cached connection if available
    if (databaseConnection) {
      resolve([databaseConnection, null]);
      return;
    }

    const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    openRequest.onerror = () => {
      console.error('IndexedDB error:', openRequest.error);
      resolve([null, openRequest.error || new Error('Failed to open IndexedDB')]);
    };

    openRequest.onsuccess = () => {
      databaseConnection = openRequest.result;
      console.log('✅ IndexedDB initialized');
      resolve([databaseConnection, null]);
    };

    openRequest.onblocked = () => {
      console.warn('⚠️ IndexedDB blocked - close other tabs using this app');
    };

    // CRITICAL PATH: Schema migration handler
    openRequest.onupgradeneeded = (event) => {
      const database = event.target.result;
      const previousVersion = event.oldVersion;
      console.log(`📦 Upgrading IndexedDB from v${previousVersion} to v${DATABASE_VERSION}...`);

      // Clean up legacy stores from v1
      if (previousVersion < 2) {
        if (database.objectStoreNames.contains('activities')) {
          database.deleteObjectStore('activities');
        }
        if (database.objectStoreNames.contains('deleted')) {
          database.deleteObjectStore('deleted');
        }
      }

      // Create trip metadata store
      if (!database.objectStoreNames.contains(STORE_NAMES.TRIP_META)) {
        database.createObjectStore(STORE_NAMES.TRIP_META, { keyPath: 'id' });
      }

      // Create trips store with region index
      if (!database.objectStoreNames.contains(STORE_NAMES.TRIPS)) {
        const tripsStore = database.createObjectStore(STORE_NAMES.TRIPS, { keyPath: 'name' });
        tripsStore.createIndex('region', 'region', { unique: false });
      }

      // Create user activities store (keyed by date)
      if (!database.objectStoreNames.contains(STORE_NAMES.USER_ACTIVITIES)) {
        database.createObjectStore(STORE_NAMES.USER_ACTIVITIES, { keyPath: 'date' });
      }

      // Create deleted activities store (keyed by date)
      if (!database.objectStoreNames.contains(STORE_NAMES.DELETED_ACTIVITIES)) {
        database.createObjectStore(STORE_NAMES.DELETED_ACTIVITIES, { keyPath: 'date' });
      }

      // Create settings store
      if (!database.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
        database.createObjectStore(STORE_NAMES.SETTINGS, { keyPath: 'key' });
      }
      
      console.log('✅ IndexedDB stores created/updated');
    };
  });
}

// =============================================================================
// SETTINGS OPERATIONS
// =============================================================================

/**
 * Checks if the initial data import has been completed.
 * @async
 * @returns {Promise<[boolean, null] | [null, Error]>} Go-style result tuple
 */
export async function isDataInitialized() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('isDataInitialized', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.SETTINGS], 'readonly');
    const settingsStore = transaction.objectStore(STORE_NAMES.SETTINGS);
    const getRequest = settingsStore.get('initialized');

    getRequest.onsuccess = () => {
      const isInitialized = getRequest.result?.value === true;
      resolve([isInitialized, null]);
    };
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to check initialization status')]);
  });
}

/**
 * Marks the database as initialized after successful data import.
 * @async
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function markInitialized() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('markInitialized', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.SETTINGS], 'readwrite');
    const settingsStore = transaction.objectStore(STORE_NAMES.SETTINGS);
    
    const settingsRecord = {
      key: 'initialized',
      value: true,
      timestamp: Date.now()
    };
    
    const putRequest = settingsStore.put(settingsRecord);
    putRequest.onsuccess = () => resolve([undefined, null]);
    putRequest.onerror = () => resolve([null, putRequest.error || new Error('Failed to mark initialized')]);
  });
}

// =============================================================================
// DATA IMPORT OPERATIONS
// =============================================================================

/**
 * Imports JSON itinerary data into IndexedDB (first-time setup).
 * This is the primary entry point for loading trip data from a JSON file.
 * Stores tripMeta, trips (with all segments), and initializes empty
 * userActivities and deletedActivities for each date.
 * 
 * @async
 * @param {Object} jsonItineraryData - The parsed JSON itinerary data
 * @param {string} [jsonItineraryData.tripName] - Name of the trip
 * @param {Object} [jsonItineraryData.budget] - Budget information
 * @param {Array} [jsonItineraryData.travelers] - List of travelers
 * @param {Array} [jsonItineraryData.trips] - Array of trip objects
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function importItineraryData(jsonItineraryData) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('importItineraryData', dbErr)];
  
  return new Promise((resolve) => {
    // CRITICAL PATH: Create transaction spanning all required stores
    const transaction = databaseConnection.transaction(
      [STORE_NAMES.TRIP_META, STORE_NAMES.TRIPS, STORE_NAMES.USER_ACTIVITIES, STORE_NAMES.DELETED_ACTIVITIES],
      'readwrite'
    );

    transaction.onerror = () => resolve([null, transaction.error || new Error('Import transaction failed')]);
    transaction.oncomplete = () => {
      console.log('✅ Itinerary data imported to IndexedDB');
      resolve([undefined, null]);
    };

    // Store trip metadata
    const tripMetaStore = transaction.objectStore(STORE_NAMES.TRIP_META);
    const tripMetadataRecord = createTripMetadataRecord(jsonItineraryData);
    tripMetaStore.put(tripMetadataRecord);

    // Store trips with all their segments
    const tripsStore = transaction.objectStore(STORE_NAMES.TRIPS);
    const tripsArray = jsonItineraryData.trips || [];
    
    for (const tripData of tripsArray) {
      const tripRecord = createTripRecord(tripData);
      tripsStore.put(tripRecord);
    }

    // CRITICAL PATH: Initialize empty activity records for all dates
    const userActivitiesStore = transaction.objectStore(STORE_NAMES.USER_ACTIVITIES);
    const deletedActivitiesStore = transaction.objectStore(STORE_NAMES.DELETED_ACTIVITIES);
    const allTripDates = extractAllDatesFromTrips(tripsArray);

    for (const dateString of allTripDates) {
      userActivitiesStore.put({ date: dateString, items: [] });
      deletedActivitiesStore.put({ date: dateString, ids: [] });
    }
  });
}

// =============================================================================
// TRIP METADATA OPERATIONS
// =============================================================================

/**
 * Retrieves the trip metadata from the database.
 * @async
 * @returns {Promise<[Object|null, null] | [null, Error]>} Go-style result tuple
 */
export async function getTripMeta() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('getTripMeta', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.TRIP_META], 'readonly');
    const tripMetaStore = transaction.objectStore(STORE_NAMES.TRIP_META);
    const getRequest = tripMetaStore.get('main');

    getRequest.onsuccess = () => resolve([getRequest.result || null, null]);
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get trip metadata')]);
  });
}

// =============================================================================
// TRIPS OPERATIONS
// =============================================================================

/**
 * Retrieves all trips from the database.
 * @async
 * @returns {Promise<[Array<Object>, null] | [null, Error]>} Go-style result tuple
 */
export async function getAllTrips() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('getAllTrips', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.TRIPS], 'readonly');
    const tripsStore = transaction.objectStore(STORE_NAMES.TRIPS);
    const getAllRequest = tripsStore.getAll();

    getAllRequest.onsuccess = () => resolve([getAllRequest.result || [], null]);
    getAllRequest.onerror = () => resolve([null, getAllRequest.error || new Error('Failed to get trips')]);
  });
}

/**
 * Retrieves the complete itinerary data structure from the database.
 * Reconstructs the original JSON structure from stored data.
 * @async
 * @returns {Promise<[Object|null, null] | [null, Error]>} Go-style result tuple
 */
export async function getItineraryData() {
  const [tripMetadata, metaErr] = await getTripMeta();
  if (metaErr) return [null, wrapError('getItineraryData', metaErr)];

  const [allTrips, tripsErr] = await getAllTrips();
  if (tripsErr) return [null, wrapError('getItineraryData', tripsErr)];

  if (!tripMetadata) return [null, null];

  return [{
    tripName: tripMetadata.tripName,
    budget: tripMetadata.budget,
    travelers: tripMetadata.travelers,
    trips: allTrips
  }, null];
}

// =============================================================================
// USER ACTIVITIES OPERATIONS
// =============================================================================

/**
 * Retrieves user-added activities for a specific date.
 * @async
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {Promise<[Array<Object>, null] | [null, Error]>} Go-style result tuple
 */
export async function getUserActivitiesForDate(dateString) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('getUserActivitiesForDate', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.USER_ACTIVITIES], 'readonly');
    const userActivitiesStore = transaction.objectStore(STORE_NAMES.USER_ACTIVITIES);
    const getRequest = userActivitiesStore.get(dateString);

    getRequest.onsuccess = () => resolve([getRequest.result?.items || [], null]);
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get user activities')]);
  });
}

/**
 * Adds a new user activity to a specific date.
 * @async
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @param {Object} activityData - The activity to add
 * @returns {Promise<[Object, null] | [null, Error]>} Go-style result tuple with added activity
 */
export async function addActivity(dateString, activityData) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('addActivity', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.USER_ACTIVITIES], 'readwrite');
    const userActivitiesStore = transaction.objectStore(STORE_NAMES.USER_ACTIVITIES);
    const getRequest = userActivitiesStore.get(dateString);

    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result || { date: dateString, items: [] };
      
      // CRITICAL PATH: Append new activity to existing items
      existingRecord.items.push(activityData);
      
      const putRequest = userActivitiesStore.put(existingRecord);
      putRequest.onsuccess = () => resolve([activityData, null]);
      putRequest.onerror = () => resolve([null, putRequest.error || new Error('Failed to add activity')]);
    };
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get existing activities')]);
  });
}

/**
 * Updates an existing user activity.
 * @async
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @param {string} activityId - ID of the activity to update
 * @param {Object} activityUpdates - Fields to update
 * @returns {Promise<[Object|undefined, null] | [null, Error]>} Go-style result tuple with updated activity
 */
export async function updateActivity(dateString, activityId, activityUpdates) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('updateActivity', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.USER_ACTIVITIES], 'readwrite');
    const userActivitiesStore = transaction.objectStore(STORE_NAMES.USER_ACTIVITIES);
    const getRequest = userActivitiesStore.get(dateString);

    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result || { date: dateString, items: [] };
      const activityIndex = existingRecord.items.findIndex(activity => activity.id === activityId);
      
      if (activityIndex !== -1) {
        // CRITICAL PATH: Update activity in place
        existingRecord.items[activityIndex] = { ...existingRecord.items[activityIndex], ...activityUpdates };
      }
      
      const putRequest = userActivitiesStore.put(existingRecord);
      putRequest.onsuccess = () => resolve([existingRecord.items[activityIndex], null]);
      putRequest.onerror = () => resolve([null, putRequest.error || new Error('Failed to update activity')]);
    };
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get existing activities')]);
  });
}

/**
 * Removes a user activity from a specific date.
 * @async
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @param {string} activityId - ID of the activity to remove
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function removeActivity(dateString, activityId) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('removeActivity', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.USER_ACTIVITIES], 'readwrite');
    const userActivitiesStore = transaction.objectStore(STORE_NAMES.USER_ACTIVITIES);
    const getRequest = userActivitiesStore.get(dateString);

    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result || { date: dateString, items: [] };
      
      // CRITICAL PATH: Filter out the removed activity
      existingRecord.items = existingRecord.items.filter(activity => activity.id !== activityId);
      
      const putRequest = userActivitiesStore.put(existingRecord);
      putRequest.onsuccess = () => resolve([undefined, null]);
      putRequest.onerror = () => resolve([null, putRequest.error || new Error('Failed to remove activity')]);
    };
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get existing activities')]);
  });
}

// =============================================================================
// DELETED ACTIVITIES OPERATIONS
// =============================================================================

/**
 * Retrieves soft-deleted activity IDs for a specific date.
 * @async
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {Promise<[Array<string>, null] | [null, Error]>} Go-style result tuple
 */
export async function getDeletedForDate(dateString) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('getDeletedForDate', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.DELETED_ACTIVITIES], 'readonly');
    const deletedActivitiesStore = transaction.objectStore(STORE_NAMES.DELETED_ACTIVITIES);
    const getRequest = deletedActivitiesStore.get(dateString);

    getRequest.onsuccess = () => resolve([getRequest.result?.ids || [], null]);
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get deleted activities')]);
  });
}

/**
 * Marks an original activity as soft-deleted.
 * This doesn't remove the activity from the original data, but records
 * that it should be hidden from the user interface.
 * @async
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @param {string} activityId - ID of the activity to mark as deleted
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function markActivityDeleted(dateString, activityId) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('markActivityDeleted', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.DELETED_ACTIVITIES], 'readwrite');
    const deletedActivitiesStore = transaction.objectStore(STORE_NAMES.DELETED_ACTIVITIES);
    const getRequest = deletedActivitiesStore.get(dateString);

    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result || { date: dateString, ids: [] };
      
      // CRITICAL PATH: Only add if not already deleted
      const isAlreadyDeleted = existingRecord.ids.includes(activityId);
      if (!isAlreadyDeleted) {
        existingRecord.ids.push(activityId);
      }
      
      const putRequest = deletedActivitiesStore.put(existingRecord);
      putRequest.onsuccess = () => resolve([undefined, null]);
      putRequest.onerror = () => resolve([null, putRequest.error || new Error('Failed to mark activity deleted')]);
    };
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get deleted records')]);
  });
}

/**
 * Retrieves all user-added activities grouped by date.
 * @async
 * @returns {Promise<[Object, null] | [null, Error]>} Go-style result tuple with date-keyed object
 */
export async function getAllManualActivities() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('getAllManualActivities', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.USER_ACTIVITIES], 'readonly');
    const userActivitiesStore = transaction.objectStore(STORE_NAMES.USER_ACTIVITIES);
    const getAllRequest = userActivitiesStore.getAll();

    getAllRequest.onsuccess = () => {
      const allRecords = getAllRequest.result || [];
      const activitiesByDate = aggregateRecordsByDate(allRecords, 'items');
      resolve([activitiesByDate, null]);
    };
    getAllRequest.onerror = () => resolve([null, getAllRequest.error || new Error('Failed to get manual activities')]);
  });
}

/**
 * Retrieves all soft-deleted activity IDs grouped by date.
 * @async
 * @returns {Promise<[Object, null] | [null, Error]>} Go-style result tuple with date-keyed object
 */
export async function getAllDeletedActivities() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('getAllDeletedActivities', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.DELETED_ACTIVITIES], 'readonly');
    const deletedActivitiesStore = transaction.objectStore(STORE_NAMES.DELETED_ACTIVITIES);
    const getAllRequest = deletedActivitiesStore.getAll();

    getAllRequest.onsuccess = () => {
      const allRecords = getAllRequest.result || [];
      const deletedIdsByDate = aggregateRecordsByDate(allRecords, 'ids');
      resolve([deletedIdsByDate, null]);
    };
    getAllRequest.onerror = () => resolve([null, getAllRequest.error || new Error('Failed to get deleted activities')]);
  });
}

// =============================================================================
// TRIP SEGMENT OPERATIONS
// =============================================================================

/**
 * Updates a specific segment within a trip.
 * @async
 * @param {string} tripName - Name of the trip containing the segment
 * @param {string} segmentId - ID of the segment to update
 * @param {Object} segmentUpdates - Fields to update on the segment
 * @returns {Promise<[Object|null, null] | [null, Error]>} Go-style result tuple with updated segment
 */
export async function updateTripSegment(tripName, segmentId, segmentUpdates) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('updateTripSegment', dbErr)];

  return new Promise((resolve) => {
    const transaction = databaseConnection.transaction([STORE_NAMES.TRIPS], 'readwrite');
    const tripsStore = transaction.objectStore(STORE_NAMES.TRIPS);
    const getRequest = tripsStore.get(tripName);

    getRequest.onsuccess = () => {
      const tripRecord = getRequest.result;
      
      if (!tripRecord) {
        resolve([null, null]);
        return;
      }

      const segmentToUpdate = tripRecord.segments.find(segment => segment.id === segmentId);
      
      if (!segmentToUpdate) {
        resolve([null, null]);
        return;
      }

      // CRITICAL PATH: Mutate segment in place and save
      Object.assign(segmentToUpdate, segmentUpdates);
      
      const putRequest = tripsStore.put(tripRecord);
      putRequest.onsuccess = () => resolve([segmentToUpdate, null]);
      putRequest.onerror = () => resolve([null, putRequest.error || new Error('Failed to update segment')]);
    };
    getRequest.onerror = () => resolve([null, getRequest.error || new Error('Failed to get trip')]);
  });
}

// =============================================================================
// DATABASE MANAGEMENT OPERATIONS
// =============================================================================

/**
 * Exports all user data (manual activities, deleted activities, trip meta) as JSON.
 * This allows users to backup their data and transfer it to other devices.
 * @async
 * @returns {Promise<[Object, null] | [null, Error]>} Go-style result tuple with export data
 */
export async function exportAllUserData() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('exportAllUserData', dbErr)];

  // Gather all user data
  const [manualActivities, manualErr] = await getAllManualActivities();
  if (manualErr) return [null, wrapError('exportAllUserData.manualActivities', manualErr)];

  const [deletedActivities, deletedErr] = await getAllDeletedActivities();
  if (deletedErr) return [null, wrapError('exportAllUserData.deletedActivities', deletedErr)];

  const [tripMeta, metaErr] = await getTripMeta();
  if (metaErr) return [null, wrapError('exportAllUserData.tripMeta', metaErr)];

  const [trips, tripsErr] = await getAllTrips();
  if (tripsErr) return [null, wrapError('exportAllUserData.trips', tripsErr)];

  const exportData = {
    version: DATABASE_VERSION,
    exportedAt: new Date().toISOString(),
    tripMeta,
    trips,
    manualActivities,
    deletedActivities
  };

  return [exportData, null];
}

/**
 * Downloads the exported user data as a JSON file.
 * @async
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function downloadUserDataAsJson() {
  const [exportData, exportErr] = await exportAllUserData();
  if (exportErr) return [null, exportErr];

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `travel-itinerary-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return [undefined, null];
}

/**
 * Imports user data from a previously exported JSON file.
 * Merges with existing data (doesn't overwrite).
 * @async
 * @param {Object} importData - The exported data object
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function importUserData(importData) {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('importUserData', dbErr)];

  // Validate import data structure
  if (!importData || typeof importData !== 'object') {
    return [null, new Error('Invalid import data format')];
  }

  // Import manual activities
  if (importData.manualActivities) {
    for (const [date, activities] of Object.entries(importData.manualActivities)) {
      for (const activity of activities) {
        const [, addErr] = await addManualActivity(date, activity);
        if (addErr) {
          console.warn(`Failed to import activity for ${date}:`, addErr);
        }
      }
    }
  }

  // Import deleted activities
  if (importData.deletedActivities) {
    for (const [date, ids] of Object.entries(importData.deletedActivities)) {
      for (const id of ids) {
        const [, delErr] = await markActivityDeleted(date, id);
        if (delErr) {
          console.warn(`Failed to import deleted activity for ${date}:`, delErr);
        }
      }
    }
  }

  console.log('✅ User data imported successfully');
  return [undefined, null];
}

/**
 * Clears all data from the database while preserving the schema.
 * Useful for resetting the app to a clean state.
 * @async
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export async function clearAllData() {
  const [, dbErr] = await initDB();
  if (dbErr) return [null, wrapError('clearAllData', dbErr)];

  return new Promise((resolve) => {
    const allStoreNames = [
      STORE_NAMES.TRIP_META,
      STORE_NAMES.TRIPS,
      STORE_NAMES.USER_ACTIVITIES,
      STORE_NAMES.DELETED_ACTIVITIES,
      STORE_NAMES.SETTINGS
    ];
    
    const transaction = databaseConnection.transaction(allStoreNames, 'readwrite');

    transaction.onerror = () => resolve([null, transaction.error || new Error('Failed to clear data')]);
    transaction.oncomplete = () => {
      console.log('🗑️ All IndexedDB data cleared');
      resolve([undefined, null]);
    };

    // CRITICAL PATH: Clear all stores in parallel within transaction
    for (const storeName of allStoreNames) {
      transaction.objectStore(storeName).clear();
    }
  });
}

/**
 * Completely deletes the IndexedDB database.
 * This is a destructive operation that removes the entire database.
 * Requires closing any existing connections first.
 * @async
 * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
 */
export function deleteDatabase() {
  return new Promise((resolve) => {
    // CRITICAL PATH: Close existing connection before deletion
    if (databaseConnection) {
      databaseConnection.close();
      databaseConnection = null;
    }
    
    const deleteRequest = indexedDB.deleteDatabase(DATABASE_NAME);
    
    deleteRequest.onsuccess = () => {
      console.log('🗑️ IndexedDB database deleted completely');
      resolve([undefined, null]);
    };
    
    deleteRequest.onerror = () => {
      console.error('Failed to delete database:', deleteRequest.error);
      resolve([null, deleteRequest.error || new Error('Failed to delete database')]);
    };
    
    deleteRequest.onblocked = () => {
      console.warn('Database deletion blocked - close other tabs using this app');
    };
  });
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

// Expose debug utilities to browser console in development
if (typeof window !== 'undefined') {
  window.__clearTravelDB = clearAllData;
  window.__deleteTravelDB = deleteDatabase;
  window.__exportTravelData = downloadUserDataAsJson;
  window.__exportTravelDataRaw = exportAllUserData;
}

// Export store names for external use
export { STORE_NAMES as STORES };
