/**
 * @fileoverview React hook for managing IndexedDB data for the travel itinerary
 * 
 * Provides a centralized state management layer for itinerary data,
 * handling loading, CRUD operations, and setup wizard flow.
 * 
 * ERROR HANDLING PATTERN:
 * =======================
 * All DB functions return Go-style [value, error] tuples.
 * This hook checks errors immediately after each call and updates error state.
 * 
 * @module db/useItineraryDB
 */

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
  markActivityDeleted,
  clearAllData
} from './indexedDB';

// =============================================================================
// CONSTANTS
// =============================================================================

/** @constant {number} MAX_DATE_RANGE_ITERATIONS - Safety limit for date iteration loops */
const MAX_DATE_RANGE_ITERATIONS = 365;

// =============================================================================
// PURE HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates the total number of unique trip days from itinerary data.
 * Handles both single-day and multi-day segments.
 * 
 * @pure
 * @param {Object|null} itineraryData - The itinerary data object
 * @param {Array} [itineraryData.trips] - Array of trip objects
 * @returns {number} Total number of unique trip days
 */
function calculateTotalTripDays(itineraryData) {
  if (!itineraryData?.trips) return 0;
  
  const uniqueTripDates = new Set();
  
  for (const trip of itineraryData.trips) {
    const segments = trip.segments || [];
    
    for (const segment of segments) {
      if (!segment.date) continue;
      
      uniqueTripDates.add(segment.date);
      
      // CRITICAL PATH: Handle multi-day segments
      if (segment.dateEnd && segment.dateEnd !== segment.date) {
        const segmentStartDate = new Date(segment.date);
        const segmentEndDate = new Date(segment.dateEnd);
        
        if (segmentEndDate >= segmentStartDate) {
          const currentIterationDate = new Date(segmentStartDate);
          let iterationCount = 0;
          
          while (currentIterationDate <= segmentEndDate && iterationCount < MAX_DATE_RANGE_ITERATIONS) {
            const dateIsoString = currentIterationDate.toISOString().split('T')[0];
            uniqueTripDates.add(dateIsoString);
            currentIterationDate.setDate(currentIterationDate.getDate() + 1);
            iterationCount++;
          }
        }
      }
    }
  }
  
  return uniqueTripDates.size;
}

/**
 * Calculates import statistics from JSON data.
 * 
 * @pure
 * @param {Object} jsonData - The JSON itinerary data
 * @returns {Object} Statistics object with trips, segments, and days counts
 */
function calculateImportStatistics(jsonData) {
  const tripsCount = jsonData.trips?.length || 0;
  
  const segmentsCount = jsonData.trips?.reduce(
    (accumulator, trip) => accumulator + (trip.segments?.length || 0),
    0
  ) || 0;
  
  const daysCount = calculateTotalTripDays(jsonData);
  
  return {
    trips: tripsCount,
    segments: segmentsCount,
    days: daysCount
  };
}

/**
 * Checks if itinerary data is valid and contains trips.
 * 
 * @pure
 * @param {Object|null} data - The itinerary data to validate
 * @returns {boolean} True if data is valid and contains trips
 */
function isValidItineraryData(data) {
  return data !== null && data.trips && data.trips.length > 0;
}

/**
 * Updates activities state immutably by adding a new activity.
 * 
 * @pure
 * @param {Object} previousState - Previous activities state object
 * @param {string} dateKey - The date key for the activity
 * @param {Object} newActivity - The activity to add
 * @returns {Object} New state object with added activity
 */
function addActivityToState(previousState, dateKey, newActivity) {
  const existingActivitiesForDate = previousState[dateKey] || [];
  return {
    ...previousState,
    [dateKey]: [...existingActivitiesForDate, newActivity]
  };
}

/**
 * Updates activities state immutably by modifying an existing activity.
 * 
 * @pure
 * @param {Object} previousState - Previous activities state object
 * @param {string} dateKey - The date key for the activity
 * @param {string} activityId - ID of activity to update
 * @param {Object} updates - Fields to update
 * @returns {Object} New state object with updated activity
 */
function updateActivityInState(previousState, dateKey, activityId, updates) {
  const existingActivitiesForDate = previousState[dateKey] || [];
  const updatedActivities = existingActivitiesForDate.map(activity =>
    activity.id === activityId ? { ...activity, ...updates } : activity
  );
  return {
    ...previousState,
    [dateKey]: updatedActivities
  };
}

/**
 * Updates activities state immutably by removing an activity.
 * 
 * @pure
 * @param {Object} previousState - Previous activities state object
 * @param {string} dateKey - The date key for the activity
 * @param {string} activityId - ID of activity to remove
 * @returns {Object} New state object without the activity
 */
function removeActivityFromState(previousState, dateKey, activityId) {
  const existingActivitiesForDate = previousState[dateKey] || [];
  const filteredActivities = existingActivitiesForDate.filter(
    activity => activity.id !== activityId
  );
  return {
    ...previousState,
    [dateKey]: filteredActivities
  };
}

/**
 * Updates deleted activities state immutably by adding a deleted ID.
 * 
 * @pure
 * @param {Object} previousState - Previous deleted activities state object
 * @param {string} dateKey - The date key
 * @param {string} activityId - ID to mark as deleted
 * @returns {Object} New state object with added deleted ID
 */
function addDeletedActivityIdToState(previousState, dateKey, activityId) {
  const existingDeletedIdsForDate = previousState[dateKey] || [];
  return {
    ...previousState,
    [dateKey]: [...existingDeletedIdsForDate, activityId]
  };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * React hook for managing IndexedDB data for the travel itinerary.
 * 
 * Handles database initialization, loading state, CRUD operations for activities,
 * and the setup wizard flow for first-time users.
 * 
 * @returns {Object} Hook state and methods
 * @property {boolean} isLoading - Whether data is currently being loaded
 * @property {boolean} isReady - Whether data is loaded and ready for use
 * @property {boolean} needsSetup - Whether setup wizard should be shown
 * @property {string|null} error - Error message if any operation failed
 * @property {Object|null} itineraryData - The loaded itinerary data
 * @property {Object} manualActivities - User-added activities by date
 * @property {Object} deletedActivities - Deleted activity IDs by date
 * @property {Function} addActivity - Add a new activity
 * @property {Function} updateActivity - Update an existing activity
 * @property {Function} removeActivity - Remove a manual activity
 * @property {Function} deleteOriginalActivity - Mark original activity as deleted
 * @property {Function} importJsonData - Import JSON data (first-time setup)
 * @property {Function} completeSetup - Complete setup wizard
 * @property {Function} resetDatabase - Reset all data
 */
export function useItineraryDB() {
  // ==========================================================================
  // STATE DECLARATIONS
  // ==========================================================================
  
  /** @type {[boolean, Function]} Loading state */
  const [isLoadingState, setIsLoadingState] = useState(true);
  
  /** @type {[boolean, Function]} Ready state (data loaded successfully) */
  const [isDataReadyState, setIsDataReadyState] = useState(false);
  
  /** @type {[boolean, Function]} Whether setup wizard should be shown */
  const [showSetupWizardState, setShowSetupWizardState] = useState(false);
  
  /** @type {[string|null, Function]} Error message state */
  const [errorMessageState, setErrorMessageState] = useState(null);
  
  /** @type {[Object|null, Function]} Main itinerary data */
  const [itineraryDataState, setItineraryDataState] = useState(null);
  
  /** @type {[Object, Function]} User-added activities keyed by date */
  const [manualActivitiesState, setManualActivitiesState] = useState({});
  
  /** @type {[Object, Function]} Deleted activity IDs keyed by date */
  const [deletedActivitiesState, setDeletedActivitiesState] = useState({});

  // ==========================================================================
  // INITIALIZATION EFFECT
  // ==========================================================================
  
  /**
   * Initialize database and load data on mount.
   * Determines whether to show setup wizard or load existing data.
   */
  useEffect(() => {
    async function initializeDatabaseAndLoadData() {
      setIsLoadingState(true);
      setErrorMessageState(null);

      // CRITICAL PATH: Initialize database connection
      const [, dbErr] = await initDB();
      if (dbErr) {
        console.error('❌ IndexedDB initialization error:', dbErr);
        setErrorMessageState(dbErr.message);
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      // Check if this is first launch
      const [hasBeenInitialized, initCheckErr] = await isDataInitialized();
      if (initCheckErr) {
        console.error('❌ Failed to check initialization status:', initCheckErr);
        setErrorMessageState(initCheckErr.message);
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      if (!hasBeenInitialized) {
        console.log('🆕 First launch detected - showing setup wizard');
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      // CRITICAL PATH: Load existing data from IndexedDB
      console.log('📂 Loading data from IndexedDB...');
      
      const [loadedItineraryData, itineraryErr] = await getItineraryData();
      if (itineraryErr) {
        console.error('❌ Failed to load itinerary data:', itineraryErr);
        setErrorMessageState(itineraryErr.message);
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      const [loadedManualActivities, manualErr] = await getAllManualActivities();
      if (manualErr) {
        console.error('❌ Failed to load manual activities:', manualErr);
        setErrorMessageState(manualErr.message);
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      const [loadedDeletedActivities, deletedErr] = await getAllDeletedActivities();
      if (deletedErr) {
        console.error('❌ Failed to load deleted activities:', deletedErr);
        setErrorMessageState(deletedErr.message);
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      // Validate loaded data
      if (!isValidItineraryData(loadedItineraryData)) {
        console.warn('⚠️ No itinerary data found, showing setup wizard');
        setShowSetupWizardState(true);
        setIsLoadingState(false);
        return;
      }

      // Update state with loaded data
      setItineraryDataState(loadedItineraryData);
      setManualActivitiesState(loadedManualActivities);
      setDeletedActivitiesState(loadedDeletedActivities);
      setIsDataReadyState(true);
      setIsLoadingState(false);
      console.log('✅ Data loaded from IndexedDB');
    }

    initializeDatabaseAndLoadData();
  }, []);

  // ==========================================================================
  // CALLBACK: LOAD DATA FROM DB
  // ==========================================================================
  
  /**
   * Loads data from IndexedDB and updates state.
   * Used internally for refresh after import.
   * 
   * @returns {Promise<[boolean, null] | [null, Error]>} Go-style result tuple
   */
  const loadDataFromDatabase = useCallback(async () => {
    const [loadedItineraryData, itineraryErr] = await getItineraryData();
    if (itineraryErr) {
      console.error('❌ Failed to load data from IndexedDB:', itineraryErr);
      setErrorMessageState(itineraryErr.message);
      setShowSetupWizardState(true);
      setIsLoadingState(false);
      return [null, itineraryErr];
    }

    const [loadedManualActivities, manualErr] = await getAllManualActivities();
    if (manualErr) {
      console.error('❌ Failed to load manual activities:', manualErr);
      setErrorMessageState(manualErr.message);
      setShowSetupWizardState(true);
      setIsLoadingState(false);
      return [null, manualErr];
    }

    const [loadedDeletedActivities, deletedErr] = await getAllDeletedActivities();
    if (deletedErr) {
      console.error('❌ Failed to load deleted activities:', deletedErr);
      setErrorMessageState(deletedErr.message);
      setShowSetupWizardState(true);
      setIsLoadingState(false);
      return [null, deletedErr];
    }

    if (!isValidItineraryData(loadedItineraryData)) {
      console.warn('⚠️ No itinerary data found, showing setup wizard');
      setShowSetupWizardState(true);
      setIsLoadingState(false);
      return [false, null];
    }

    setItineraryDataState(loadedItineraryData);
    setManualActivitiesState(loadedManualActivities);
    setDeletedActivitiesState(loadedDeletedActivities);
    setIsDataReadyState(true);
    setIsLoadingState(false);
    return [true, null];
  }, []);

  // ==========================================================================
  // CALLBACK: IMPORT JSON DATA
  // ==========================================================================
  
  /**
   * Imports user-provided JSON data to IndexedDB.
   * Called from setup wizard after user uploads a JSON file.
   * 
   * @param {Object} jsonItineraryData - The parsed JSON itinerary data
   * @returns {Promise<[Object, null] | [null, Error]>} Go-style result tuple with import statistics
   */
  const importJsonDataToDatabase = useCallback(async (jsonItineraryData) => {
    console.log('🚀 Importing user JSON data to IndexedDB...');
    
    // CRITICAL PATH: Import data
    const [, importErr] = await importItineraryData(jsonItineraryData);
    if (importErr) {
      console.error('❌ Import failed:', importErr);
      return [null, importErr];
    }

    // Mark as initialized
    const [, markErr] = await markInitialized();
    if (markErr) {
      console.error('❌ Failed to mark initialized:', markErr);
      return [null, markErr];
    }
    
    console.log('✅ Data import complete!');
    
    // Calculate statistics for the wizard
    const importStatistics = calculateImportStatistics(jsonItineraryData);
    
    // CRITICAL PATH: Load data directly (avoid stale closure issues)
    const [loadedItineraryData, itineraryErr] = await getItineraryData();
    if (itineraryErr) return [null, itineraryErr];

    const [loadedManualActivities, manualErr] = await getAllManualActivities();
    if (manualErr) return [null, manualErr];

    const [loadedDeletedActivities, deletedErr] = await getAllDeletedActivities();
    if (deletedErr) return [null, deletedErr];
    
    // Update all state at once
    setItineraryDataState(loadedItineraryData);
    setManualActivitiesState(loadedManualActivities);
    setDeletedActivitiesState(loadedDeletedActivities);
    setIsDataReadyState(true);
    setIsLoadingState(false);
    setShowSetupWizardState(false);
    
    return [importStatistics, null];
  }, []);

  // ==========================================================================
  // CALLBACK: COMPLETE SETUP
  // ==========================================================================
  
  /**
   * Completes setup without showing wizard again.
   */
  const completeSetupWizard = useCallback(() => {
    setShowSetupWizardState(false);
  }, []);

  // ==========================================================================
  // CALLBACK: ADD ACTIVITY
  // ==========================================================================
  
  /**
   * Adds a new user activity to a specific date.
   * 
   * @param {string} dateString - The date to add the activity to
   * @param {Object} activityData - The activity data to add
   * @returns {Promise<[Object, null] | [null, Error]>} Go-style result tuple with added activity
   */
  const addNewUserActivity = useCallback(async (dateString, activityData) => {
    const [, addErr] = await addActivity(dateString, activityData);
    if (addErr) {
      console.error('Failed to add activity:', addErr);
      return [null, addErr];
    }
    
    setManualActivitiesState(previousState =>
      addActivityToState(previousState, dateString, activityData)
    );
    return [activityData, null];
  }, []);

  // ==========================================================================
  // CALLBACK: UPDATE ACTIVITY
  // ==========================================================================
  
  /**
   * Updates an existing user activity.
   * 
   * @param {string} dateString - The date of the activity
   * @param {string} activityId - ID of the activity to update
   * @param {Object} activityUpdates - Fields to update
   * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
   */
  const updateExistingUserActivity = useCallback(async (dateString, activityId, activityUpdates) => {
    const [, updateErr] = await updateActivity(dateString, activityId, activityUpdates);
    if (updateErr) {
      console.error('Failed to update activity:', updateErr);
      return [null, updateErr];
    }
    
    setManualActivitiesState(previousState =>
      updateActivityInState(previousState, dateString, activityId, activityUpdates)
    );
    return [undefined, null];
  }, []);

  // ==========================================================================
  // CALLBACK: REMOVE ACTIVITY
  // ==========================================================================
  
  /**
   * Removes a manual (user-added) activity.
   * 
   * @param {string} dateString - The date of the activity
   * @param {string} activityId - ID of the activity to remove
   * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
   */
  const removeUserActivity = useCallback(async (dateString, activityId) => {
    const [, removeErr] = await removeActivity(dateString, activityId);
    if (removeErr) {
      console.error('Failed to remove activity:', removeErr);
      return [null, removeErr];
    }
    
    setManualActivitiesState(previousState =>
      removeActivityFromState(previousState, dateString, activityId)
    );
    return [undefined, null];
  }, []);

  // ==========================================================================
  // CALLBACK: DELETE ORIGINAL ACTIVITY
  // ==========================================================================
  
  /**
   * Marks an original (JSON-sourced) activity as deleted.
   * 
   * @param {string} dateString - The date of the activity
   * @param {string} activityId - ID of the activity to delete
   * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
   */
  const deleteOriginalActivityById = useCallback(async (dateString, activityId) => {
    const [, deleteErr] = await markActivityDeleted(dateString, activityId);
    if (deleteErr) {
      console.error('Failed to delete activity:', deleteErr);
      return [null, deleteErr];
    }
    
    setDeletedActivitiesState(previousState =>
      addDeletedActivityIdToState(previousState, dateString, activityId)
    );
    return [undefined, null];
  }, []);

  // ==========================================================================
  // CALLBACK: RESET DATABASE
  // ==========================================================================
  
  /**
   * Resets the database by clearing all data and showing setup wizard.
   * 
   * @returns {Promise<[void, null] | [null, Error]>} Go-style result tuple
   */
  const resetDatabaseToCleanState = useCallback(async () => {
    console.log('🗑️ Resetting database...');
    
    const [, clearErr] = await clearAllData();
    if (clearErr) {
      console.error('❌ Failed to reset database:', clearErr);
      return [null, clearErr];
    }
    
    // Reset all state to initial values
    setItineraryDataState(null);
    setManualActivitiesState({});
    setDeletedActivitiesState({});
    setIsDataReadyState(false);
    setShowSetupWizardState(true);
    
    console.log('✅ Database reset complete');
    return [undefined, null];
  }, []);

  // ==========================================================================
  // RETURN HOOK API
  // ==========================================================================
  
  return {
    // State
    isLoading: isLoadingState,
    isReady: isDataReadyState,
    needsSetup: showSetupWizardState,
    error: errorMessageState,
    itineraryData: itineraryDataState,
    manualActivities: manualActivitiesState,
    deletedActivities: deletedActivitiesState,
    
    // Methods (with backward-compatible names)
    addActivity: addNewUserActivity,
    updateActivity: updateExistingUserActivity,
    removeActivity: removeUserActivity,
    deleteOriginalActivity: deleteOriginalActivityById,
    importJsonData: importJsonDataToDatabase,
    completeSetup: completeSetupWizard,
    resetDatabase: resetDatabaseToCleanState
  };
}
