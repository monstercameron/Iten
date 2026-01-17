/**
 * IndexedDB wrapper for Travel Itinerary App
 * Stores all trip data persistently in the browser
 */

const DB_NAME = 'TravelItineraryDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  TRIP_META: 'tripMeta',      // Trip name, budget, travelers
  TRIPS: 'trips',             // All trip data with segments
  ACTIVITIES: 'activities',    // User-added activities (by date)
  DELETED: 'deleted',         // Deleted activity IDs
  SETTINGS: 'settings'        // App settings
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
      console.log('📦 Creating IndexedDB stores...');

      // Trip metadata store (single record)
      if (!database.objectStoreNames.contains(STORES.TRIP_META)) {
        database.createObjectStore(STORES.TRIP_META, { keyPath: 'id' });
      }

      // Trips store (array of trip objects)
      if (!database.objectStoreNames.contains(STORES.TRIPS)) {
        const tripsStore = database.createObjectStore(STORES.TRIPS, { keyPath: 'name' });
        tripsStore.createIndex('region', 'region', { unique: false });
      }

      // Activities store (keyed by date)
      if (!database.objectStoreNames.contains(STORES.ACTIVITIES)) {
        const activitiesStore = database.createObjectStore(STORES.ACTIVITIES, { keyPath: 'date' });
        activitiesStore.createIndex('date', 'date', { unique: true });
      }

      // Deleted activities store
      if (!database.objectStoreNames.contains(STORES.DELETED)) {
        database.createObjectStore(STORES.DELETED, { keyPath: 'date' });
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
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
 */
export async function importItineraryData(jsonData) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.TRIP_META, STORES.TRIPS, STORES.ACTIVITIES, STORES.DELETED],
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
      tripName: jsonData.tripName,
      budget: jsonData.budget,
      travelers: jsonData.travelers
    });

    // Store trips
    const tripsStore = transaction.objectStore(STORES.TRIPS);
    jsonData.trips.forEach(trip => {
      tripsStore.put(trip);
    });

    // Initialize empty activities and deleted stores for each date
    const activitiesStore = transaction.objectStore(STORES.ACTIVITIES);
    const deletedStore = transaction.objectStore(STORES.DELETED);
    
    // Extract all unique dates from segments
    const dates = new Set();
    jsonData.trips.forEach(trip => {
      trip.segments.forEach(segment => {
        if (segment.date) dates.add(segment.date);
        if (segment.dateEnd) dates.add(segment.dateEnd);
      });
    });

    dates.forEach(date => {
      activitiesStore.put({ date, items: [] });
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
 * Get activities for a specific date
 */
export async function getActivitiesForDate(date) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.ACTIVITIES);
    const request = store.get(date);

    request.onsuccess = () => resolve(request.result?.items || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add activity to a date
 */
export async function addActivity(date, activity) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.ACTIVITIES);
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
 * Update activity for a date
 */
export async function updateActivity(date, activityId, updates) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.ACTIVITIES);
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
 * Remove activity from a date
 */
export async function removeActivity(date, activityId) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.ACTIVITIES);
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
    const transaction = db.transaction([STORES.DELETED], 'readonly');
    const store = transaction.objectStore(STORES.DELETED);
    const request = store.get(date);

    request.onsuccess = () => resolve(request.result?.ids || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark activity as deleted
 */
export async function markActivityDeleted(date, activityId) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DELETED], 'readwrite');
    const store = transaction.objectStore(STORES.DELETED);
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
 * Get all manual activities (for all dates)
 */
export async function getAllManualActivities() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.ACTIVITIES);
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
    const transaction = db.transaction([STORES.DELETED], 'readonly');
    const store = transaction.objectStore(STORES.DELETED);
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
      [STORES.TRIP_META, STORES.TRIPS, STORES.ACTIVITIES, STORES.DELETED, STORES.SETTINGS],
      'readwrite'
    );

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      console.log('🗑️ All IndexedDB data cleared');
      resolve();
    };

    transaction.objectStore(STORES.TRIP_META).clear();
    transaction.objectStore(STORES.TRIPS).clear();
    transaction.objectStore(STORES.ACTIVITIES).clear();
    transaction.objectStore(STORES.DELETED).clear();
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
