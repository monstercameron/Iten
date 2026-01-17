/**
 * IndexedDB wrapper for Travel Itinerary App
 * Stores all trip data persistently in the browser
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
 */

const DB_NAME = 'TravelItineraryDB';
const DB_VERSION = 2; // Bumped version for schema changes

// Store names
const STORES = {
  TRIP_META: 'tripMeta',           // Trip name, budget, travelers
  TRIPS: 'trips',                  // All trip data with segments (flights, shelters, original activities)
  USER_ACTIVITIES: 'userActivities', // User-added activities (by date)
  DELETED_ACTIVITIES: 'deletedActivities', // Deleted original activity IDs (by date)
  SETTINGS: 'settings'             // App settings
};

let db = null;

/**
 * Initialize IndexedDB
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const oldVersion = event.oldVersion;
      console.log(`📦 Upgrading IndexedDB from v${oldVersion} to v${DB_VERSION}...`);

      // Delete old stores if upgrading from v1
      if (oldVersion < 2) {
        if (database.objectStoreNames.contains('activities')) {
          database.deleteObjectStore('activities');
        }
        if (database.objectStoreNames.contains('deleted')) {
          database.deleteObjectStore('deleted');
        }
      }

      // Trip metadata store (single record)
      if (!database.objectStoreNames.contains(STORES.TRIP_META)) {
        database.createObjectStore(STORES.TRIP_META, { keyPath: 'id' });
      }

      // Trips store - contains full trip data including segments with flights, shelters, activities
      if (!database.objectStoreNames.contains(STORES.TRIPS)) {
        const tripsStore = database.createObjectStore(STORES.TRIPS, { keyPath: 'name' });
        tripsStore.createIndex('region', 'region', { unique: false });
      }

      // User activities store - activities added by user (keyed by date)
      if (!database.objectStoreNames.contains(STORES.USER_ACTIVITIES)) {
        database.createObjectStore(STORES.USER_ACTIVITIES, { keyPath: 'date' });
      }

      // Deleted activities store - IDs of original activities user has removed
      if (!database.objectStoreNames.contains(STORES.DELETED_ACTIVITIES)) {
        database.createObjectStore(STORES.DELETED_ACTIVITIES, { keyPath: 'date' });
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      
      console.log('✅ IndexedDB stores created/updated');
    };
  });
}

/**
 * Check if data has been initialized
 */
export async function isDataInitialized() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETTINGS], 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get('initialized');

    request.onsuccess = () => {
      resolve(request.result?.value === true);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark data as initialized
 */
export async function markInitialized() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.put({ key: 'initialized', value: true, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Import JSON data into IndexedDB (first-time setup)
 * Stores: tripMeta, trips (with all segments including flights/shelters/activities)
 * Initializes empty userActivities and deletedActivities for each date
 */
export async function importItineraryData(jsonData) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.TRIP_META, STORES.TRIPS, STORES.USER_ACTIVITIES, STORES.DELETED_ACTIVITIES],
      'readwrite'
    );

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      console.log('✅ Itinerary data imported to IndexedDB');
      resolve();
    };

    // Store trip metadata
    const metaStore = transaction.objectStore(STORES.TRIP_META);
    metaStore.put({
      id: 'main',
      tripName: jsonData.tripName || 'My Trip',
      budget: jsonData.budget || { total: 0, currency: 'USD' },
      travelers: jsonData.travelers || []
    });

    // Store trips with all their segments (flights, shelters, activities, etc.)
    const tripsStore = transaction.objectStore(STORES.TRIPS);
    (jsonData.trips || []).forEach(trip => {
      tripsStore.put({
        name: trip.name,
        region: trip.region,
        segments: trip.segments || []
      });
    });

    // Initialize empty user activities and deleted activities for each date
    const userActivitiesStore = transaction.objectStore(STORES.USER_ACTIVITIES);
    const deletedStore = transaction.objectStore(STORES.DELETED_ACTIVITIES);
    
    // Extract all unique dates from segments
    const dates = new Set();
    (jsonData.trips || []).forEach(trip => {
      (trip.segments || []).forEach(segment => {
        if (segment.date) dates.add(segment.date);
        if (segment.dateEnd) {
          // Add all dates in range
          const start = new Date(segment.date);
          const end = new Date(segment.dateEnd);
          const current = new Date(start);
          while (current <= end) {
            dates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      });
    });

    dates.forEach(date => {
      userActivitiesStore.put({ date, items: [] });
      deletedStore.put({ date, ids: [] });
    });
  });
}

/**
 * Get trip metadata
 */
export async function getTripMeta() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.TRIP_META], 'readonly');
    const store = transaction.objectStore(STORES.TRIP_META);
    const request = store.get('main');

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all trips
 */
export async function getAllTrips() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.TRIPS], 'readonly');
    const store = transaction.objectStore(STORES.TRIPS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get full itinerary data (reconstructed from IndexedDB)
 */
export async function getItineraryData() {
  const meta = await getTripMeta();
  const trips = await getAllTrips();

  if (!meta) return null;

  return {
    tripName: meta.tripName,
    budget: meta.budget,
    travelers: meta.travelers,
    trips: trips
  };
}

/**
 * Get user-added activities for a specific date
 */
export async function getUserActivitiesForDate(date) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USER_ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.USER_ACTIVITIES);
    const request = store.get(date);

    request.onsuccess = () => resolve(request.result?.items || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a user activity to a date
 */
export async function addActivity(date, activity) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USER_ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.USER_ACTIVITIES);
    const getRequest = store.get(date);

    getRequest.onsuccess = () => {
      const data = getRequest.result || { date, items: [] };
      data.items.push(activity);
      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve(activity);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Update a user activity for a date
 */
export async function updateActivity(date, activityId, updates) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USER_ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.USER_ACTIVITIES);
    const getRequest = store.get(date);

    getRequest.onsuccess = () => {
      const data = getRequest.result || { date, items: [] };
      const index = data.items.findIndex(a => a.id === activityId);
      if (index !== -1) {
        data.items[index] = { ...data.items[index], ...updates };
      }
      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve(data.items[index]);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Remove a user activity from a date
 */
export async function removeActivity(date, activityId) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USER_ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.USER_ACTIVITIES);
    const getRequest = store.get(date);

    getRequest.onsuccess = () => {
      const data = getRequest.result || { date, items: [] };
      data.items = data.items.filter(a => a.id !== activityId);
      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get deleted activity IDs for a date
 */
export async function getDeletedForDate(date) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DELETED_ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.DELETED_ACTIVITIES);
    const request = store.get(date);

    request.onsuccess = () => resolve(request.result?.ids || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark an original activity as deleted (soft delete)
 */
export async function markActivityDeleted(date, activityId) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DELETED_ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.DELETED_ACTIVITIES);
    const getRequest = store.get(date);

    getRequest.onsuccess = () => {
      const data = getRequest.result || { date, ids: [] };
      if (!data.ids.includes(activityId)) {
        data.ids.push(activityId);
      }
      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get all user-added activities (for all dates)
 */
export async function getAllManualActivities() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USER_ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.USER_ACTIVITIES);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = {};
      (request.result || []).forEach(record => {
        if (record.items && record.items.length > 0) {
          result[record.date] = record.items;
        }
      });
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all deleted activity IDs (for all dates)
 */
export async function getAllDeletedActivities() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DELETED_ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.DELETED_ACTIVITIES);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = {};
      (request.result || []).forEach(record => {
        if (record.ids && record.ids.length > 0) {
          result[record.date] = record.ids;
        }
      });
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update a trip's segment (e.g., to add activities to a segment)
 */
export async function updateTripSegment(tripName, segmentId, updates) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.TRIPS], 'readwrite');
    const store = transaction.objectStore(STORES.TRIPS);
    const getRequest = store.get(tripName);

    getRequest.onsuccess = () => {
      const trip = getRequest.result;
      if (trip) {
        const segment = trip.segments.find(s => s.id === segmentId);
        if (segment) {
          Object.assign(segment, updates);
          const putRequest = store.put(trip);
          putRequest.onsuccess = () => resolve(segment);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.TRIP_META, STORES.TRIPS, STORES.USER_ACTIVITIES, STORES.DELETED_ACTIVITIES, STORES.SETTINGS],
      'readwrite'
    );

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      console.log('🗑️ All IndexedDB data cleared');
      resolve();
    };

    transaction.objectStore(STORES.TRIP_META).clear();
    transaction.objectStore(STORES.TRIPS).clear();
    transaction.objectStore(STORES.USER_ACTIVITIES).clear();
    transaction.objectStore(STORES.DELETED_ACTIVITIES).clear();
    transaction.objectStore(STORES.SETTINGS).clear();
  });
}

/**
 * Delete the entire database (for complete reset)
 */
export function deleteDatabase() {
  return new Promise((resolve, reject) => {
    // Close existing connection
    if (db) {
      db.close();
      db = null;
    }
    
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log('🗑️ IndexedDB database deleted completely');
      resolve();
    };
    
    request.onerror = () => {
      console.error('Failed to delete database:', request.error);
      reject(request.error);
    };
    
    request.onblocked = () => {
      console.warn('Database deletion blocked - close other tabs using this app');
    };
  });
}

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.__clearTravelDB = clearAllData;
  window.__deleteTravelDB = deleteDatabase;
}

export { STORES };
