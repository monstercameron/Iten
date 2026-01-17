import { useState, useEffect, useCallback } from 'react';
import {
  initDB,
  isDataInitialized,
  markInitialized,
  importItineraryData,
  getItineraryData,
  getAllManualActivities,
  getAllDeletedActivities,
  addActivity,
  updateActivity,
  removeActivity,
  markActivityDeleted
} from './indexedDB';
import rawItineraryData from '../data/rawItinerary.json';

/**
 * Hook to manage IndexedDB data for the travel itinerary
 * Handles initial data load and provides CRUD operations
 */
export function useItineraryDB() {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState(null);
  const [itineraryData, setItineraryData] = useState(null);
  const [manualActivities, setManualActivities] = useState({});
  const [deletedActivities, setDeletedActivities] = useState({});

  // Initialize DB and check if setup is needed
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize the database
        await initDB();

        // Check if this is first load
        const initialized = await isDataInitialized();

        if (!initialized) {
          // Show setup wizard
          console.log('🆕 First launch detected - showing setup wizard');
          setNeedsSetup(true);
          setIsLoading(false);
          return;
        }

        // Data already initialized - load from IndexedDB
        console.log('📂 Loading data from IndexedDB...');
        await loadDataFromDB();
        
      } catch (err) {
        console.error('❌ IndexedDB initialization error:', err);
        setError(err.message);
        
        // Fallback to raw JSON data
        setItineraryData(rawItineraryData);
        setIsReady(true);
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Load data from IndexedDB
  const loadDataFromDB = async () => {
    const data = await getItineraryData();
    const activities = await getAllManualActivities();
    const deleted = await getAllDeletedActivities();

    setItineraryData(data);
    setManualActivities(activities);
    setDeletedActivities(deleted);
    setIsReady(true);
    setIsLoading(false);
  };

  // Import JSON data to IndexedDB (called from setup wizard)
  const performImport = useCallback(async () => {
    try {
      console.log('🚀 Importing JSON data to IndexedDB...');
      
      // Import the raw itinerary data
      await importItineraryData(rawItineraryData);
      await markInitialized();
      
      console.log('✅ Data import complete!');
      
      // Calculate stats for the wizard
      const stats = {
        trips: rawItineraryData.trips?.length || 0,
        segments: rawItineraryData.trips?.reduce((acc, trip) => acc + (trip.segments?.length || 0), 0) || 0,
        days: calculateTripDays(rawItineraryData)
      };
      
      // Load the data
      await loadDataFromDB();
      setNeedsSetup(false);
      
      return stats;
    } catch (err) {
      console.error('❌ Import failed:', err);
      throw err;
    }
  }, []);

  // Complete setup without showing wizard again
  const completeSetup = useCallback(() => {
    setNeedsSetup(false);
  }, []);

  // Add a new activity
  const addNewActivity = useCallback(async (date, activity) => {
    try {
      await addActivity(date, activity);
      setManualActivities(prev => ({
        ...prev,
        [date]: [...(prev[date] || []), activity]
      }));
      return activity;
    } catch (err) {
      console.error('Failed to add activity:', err);
      throw err;
    }
  }, []);

  // Update an existing activity
  const updateExistingActivity = useCallback(async (date, activityId, updates) => {
    try {
      await updateActivity(date, activityId, updates);
      setManualActivities(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(a => 
          a.id === activityId ? { ...a, ...updates } : a
        )
      }));
    } catch (err) {
      console.error('Failed to update activity:', err);
      throw err;
    }
  }, []);

  // Remove a manual activity
  const removeManualActivity = useCallback(async (date, activityId) => {
    try {
      await removeActivity(date, activityId);
      setManualActivities(prev => ({
        ...prev,
        [date]: (prev[date] || []).filter(a => a.id !== activityId)
      }));
    } catch (err) {
      console.error('Failed to remove activity:', err);
      throw err;
    }
  }, []);

  // Mark an original activity as deleted
  const deleteOriginalActivity = useCallback(async (date, activityId) => {
    try {
      await markActivityDeleted(date, activityId);
      setDeletedActivities(prev => ({
        ...prev,
        [date]: [...(prev[date] || []), activityId]
      }));
    } catch (err) {
      console.error('Failed to delete activity:', err);
      throw err;
    }
  }, []);

  return {
    isLoading,
    isReady,
    needsSetup,
    error,
    itineraryData,
    manualActivities,
    deletedActivities,
    addActivity: addNewActivity,
    updateActivity: updateExistingActivity,
    removeActivity: removeManualActivity,
    deleteOriginalActivity,
    performImport,
    completeSetup
  };
}

/**
 * Calculate total trip days from itinerary data
 */
function calculateTripDays(data) {
  if (!data?.trips) return 0;
  
  const allDates = new Set();
  
  data.trips.forEach(trip => {
    trip.segments?.forEach(segment => {
      if (segment.date) {
        allDates.add(segment.date);
        
        // Handle multi-day segments
        if (segment.dateEnd && segment.dateEnd !== segment.date) {
          const start = new Date(segment.date);
          const end = new Date(segment.dateEnd);
          const current = new Date(start);
          
          while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            allDates.add(dateStr);
            current.setDate(current.getDate() + 1);
          }
        }
      }
    });
  });
  
  return allDates.size;
}
