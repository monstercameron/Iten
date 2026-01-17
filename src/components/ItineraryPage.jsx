/**
 * @fileoverview Main itinerary page component.
 * 
 * This is the primary view component that:
 * - Displays the complete trip itinerary as expandable day cards
 * - Shows budget tracking with progress visualization
 * - Handles search/filter functionality
 * - Manages activity CRUD operations (add, update, delete)
 * - Coordinates with IndexedDB for data persistence
 * 
 * @module components/ItineraryPage
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Eye, EyeOff, AlertCircle, Wallet, Loader2 } from "lucide-react";
import { parseItineraryData, getTripMeta, ITINERARY_DAYS as FALLBACK_DAYS, TRIP_BUDGET as FALLBACK_BUDGET, TRIP_NAME as FALLBACK_NAME } from "../data/itinerary";
import { useItineraryDB } from "../db";
import { clearAllData } from "../db/indexedDB";
import { DayCard } from "./DayCard";
import { SetupWizard } from "./SetupWizard";
import { classNames } from "../utils/classNames";
import { DateNavigation } from "./DateNavigation";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Approximate exchange rates for budget calculation (relative to USD).
 * These are used for rough budget tracking, not financial transactions.
 * @constant {Object.<string, number>}
 */
const CURRENCY_EXCHANGE_RATES_TO_USD = {
  'USD': 1,
  'PHP': 0.018,  // ~56 PHP per USD
  'JPY': 0.0067  // ~150 JPY per USD
};

/**
 * Prefix for manually-added activity IDs.
 * Used to distinguish user-created activities from imported ones.
 * @constant {string}
 */
const MANUAL_ACTIVITY_ID_PREFIX = 'manual-';

/**
 * Empty array constant to avoid creating new array references on every render.
 * Used as default value for days without manual/deleted activities.
 * @constant {Array}
 */
const EMPTY_ARRAY = [];

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Converts a currency amount to USD using approximate exchange rates.
 * @pure
 * @param {number} amount - The amount in the source currency
 * @param {string} currencyCode - The ISO currency code (e.g., 'USD', 'PHP', 'JPY')
 * @returns {number} The approximate USD equivalent
 */
function convertCurrencyToUSD(amount, currencyCode) {
  const exchangeRate = CURRENCY_EXCHANGE_RATES_TO_USD[currencyCode] || 1;
  return amount * exchangeRate;
}

/**
 * Checks if an activity ID belongs to a manually-added activity.
 * @pure
 * @param {string} activityId - The activity ID to check
 * @returns {boolean} True if the activity was manually added
 */
function isManualActivityId(activityId) {
  return activityId?.startsWith(MANUAL_ACTIVITY_ID_PREFIX) ?? false;
}

/**
 * Generates a unique identifier for a shelter cost to prevent duplicate counting.
 * @pure
 * @param {Object} shelter - The shelter data
 * @returns {string} A unique identifier for the shelter cost
 */
function generateShelterCostIdentifier(shelter) {
  return `shelter-${shelter.name}-${shelter.estimatedCost}`;
}

/**
 * Generates a unique identifier for an activity to prevent duplicate counting.
 * @pure
 * @param {Object} activity - The activity data
 * @param {string} dateKey - The date key for the activity
 * @returns {string} A unique identifier for the activity
 */
function generateActivityCostIdentifier(activity, dateKey) {
  return activity.id || `activity-${dateKey}-${activity.name}`;
}

/**
 * Formats a date key (YYYY-MM-DD) for display.
 * @pure
 * @param {string} dateKey - The date key in YYYY-MM-DD format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2024")
 */
function formatDateKeyForDisplay(dateKey) {
  const dateObject = new Date(dateKey + 'T00:00:00');
  return dateObject.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Calculates the trip date range display string.
 * @pure
 * @param {Array} itineraryDays - Array of day objects
 * @returns {string} Formatted date range (e.g., "Jan 15, 2024 – Jan 22, 2024")
 */
function calculateTripDateRangeDisplay(itineraryDays) {
  if (itineraryDays.length === 0) return '';
  
  const firstDayEntry = itineraryDays[0];
  const lastDayEntry = itineraryDays[itineraryDays.length - 1];
  
  return `${formatDateKeyForDisplay(firstDayEntry.dateKey)} – ${formatDateKeyForDisplay(lastDayEntry.dateKey)}`;
}

/**
 * Filters itinerary days based on a search query.
 * @pure
 * @param {Array} itineraryDays - Array of day objects to filter
 * @param {string} searchQuery - The search query string
 * @returns {Array} Filtered array of day objects
 */
function filterItineraryBySearchQuery(itineraryDays, searchQuery) {
  if (!searchQuery.trim()) return itineraryDays;

  const normalizedQuery = searchQuery.toLowerCase();
  return itineraryDays.filter((dayEntry) => {
    return (
      dayEntry.dateDisplay.toLowerCase().includes(normalizedQuery) ||
      dayEntry.summary.toLowerCase().includes(normalizedQuery) ||
      dayEntry.timezone.toLowerCase().includes(normalizedQuery)
    );
  });
}

/**
 * Determines the progress bar color class based on budget usage percentage.
 * @pure
 * @param {number} percentUsed - The percentage of budget used
 * @returns {string} Tailwind CSS class for the progress bar color
 */
function getBudgetProgressBarColorClass(percentUsed) {
  if (percentUsed > 100) return "bg-red-500";
  if (percentUsed > 80) return "bg-amber-500";
  return "bg-emerald-500";
}

/**
 * Determines the remaining budget text color class.
 * @pure
 * @param {number} remainingAmount - The remaining budget amount
 * @returns {string} Tailwind CSS class for the text color
 */
function getRemainingBudgetColorClass(remainingAmount) {
  return remainingAmount >= 0 ? "text-emerald-400" : "text-red-400";
}

/**
 * Determines the percentage used text color class.
 * @pure
 * @param {number} percentUsed - The percentage of budget used
 * @returns {string} Tailwind CSS class for the text color
 */
function getPercentUsedColorClass(percentUsed) {
  if (percentUsed > 100) return "text-red-400";
  if (percentUsed > 80) return "text-amber-400";
  return "text-zinc-300";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Main itinerary page component - the primary view of the application.
 * 
 * Manages the complete trip display including:
 * - Day-by-day itinerary cards with expand/collapse
 * - Budget tracking with visual progress bar
 * - Search/filter functionality
 * - Activity management (add, edit, delete)
 * - Loading, error, and setup wizard states
 * 
 * @returns {JSX.Element} The complete itinerary page
 */
export function ItineraryPage() {
  // ============================================================================
  // UI STATE
  // ============================================================================
  
  /** @type {[Set<string>, Function]} Set of expanded day keys */
  const [expandedDayKeys, setExpandedDayKeys] = useState(new Set());
  
  /** @type {[Set<string>, Function]} Set of expanded section keys (format: "dayKey:sectionName") */
  const [expandedSectionKeys, setExpandedSectionKeys] = useState(new Set());
  
  /** @type {[boolean, Function]} Whether backup plans are visible */
  const [areBackupPlansVisible, setAreBackupPlansVisible] = useState(false);
  
  /** @type {[string, Function]} Current search query */
  const [searchQueryText, setSearchQueryText] = useState("");
  
  // ============================================================================
  // DATABASE INTEGRATION
  // ============================================================================
  
  // CRITICAL PATH: IndexedDB hook provides all persistent data and operations
  const {
    isLoading: isDatabaseLoading,
    isReady: isDatabaseReady,
    needsSetup: needsSetupWizard,
    error: databaseError,
    itineraryData: storedItineraryData,
    manualActivities: manualActivitiesByDate,
    deletedActivities: deletedActivityIdsByDate,
    addActivity: addActivityToDatabase,
    updateActivity: updateActivityInDatabase,
    removeActivity: removeActivityFromDatabase,
    deleteOriginalActivity: deleteOriginalActivityFromDatabase,
    importJsonData: importJsonToDatabase,
    completeSetup: completeSetupWizard,
    resetDatabase: resetAllDatabaseData
  } = useItineraryDB();
  
  // ============================================================================
  // DERIVED DATA
  // ============================================================================
  
  /**
   * Parse the itinerary data from IndexedDB (or use fallback).
   * Memoized to prevent unnecessary re-parsing.
   */
  const { parsedItineraryDays, tripBudgetConfig, tripDisplayName } = useMemo(() => {
    if (!isDatabaseReady || !storedItineraryData) {
      return {
        parsedItineraryDays: FALLBACK_DAYS,
        tripBudgetConfig: FALLBACK_BUDGET,
        tripDisplayName: FALLBACK_NAME
      };
    }
    
    const tripMetadata = getTripMeta(storedItineraryData);
    return {
      parsedItineraryDays: parseItineraryData(storedItineraryData),
      tripBudgetConfig: tripMetadata.budget,
      tripDisplayName: tripMetadata.tripName
    };
  }, [isDatabaseReady, storedItineraryData]);
  
  // Ensure manual activities is always an object (for safety)
  const manualActivitiesLookup = manualActivitiesByDate || {};

  /**
   * Today's date key - memoized to avoid recalculation.
   * Note: Only updates on component mount, which is fine for a day-level precision.
   */
  const todayDateKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  // ============================================================================
  // AUTO-EXPAND TODAY EFFECT
  // ============================================================================
  
  /**
   * Automatically expands and scrolls to today's date card on page load.
   */
  useEffect(() => {
    if (!isDatabaseReady) return;
    
    // CRITICAL PATH: Check if today exists in the itinerary
    const todayExistsInItinerary = parsedItineraryDays.some(
      dayEntry => dayEntry.dateKey === todayDateKey
    );
    
    if (todayExistsInItinerary) {
      setExpandedDayKeys(new Set([todayDateKey]));
      
      // Scroll to today's card after DOM updates
      setTimeout(() => {
        const todayCardElement = document.getElementById(`day-${todayDateKey}`);
        if (todayCardElement) {
          todayCardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [isDatabaseReady, parsedItineraryDays, todayDateKey]);

  // ============================================================================
  // ACTIVITY MANAGEMENT CALLBACKS
  // ============================================================================

  /**
   * Adds a new manual activity for a specific date.
   * @param {Object} activityData - The activity data to add
   * @param {string} dateKey - The date key (YYYY-MM-DD) to add the activity to
   */
  const handleAddManualActivity = useCallback(async (activityData, dateKey) => {
    const [, addErr] = await addActivityToDatabase(dateKey, activityData);
    if (addErr) {
      console.error('Failed to add activity:', addErr);
    }
  }, [addActivityToDatabase]);

  /**
   * Updates an existing manual activity.
   * @param {Object} activityData - The updated activity data (must include id)
   * @param {string} dateKey - The date key for the activity
   */
  const handleUpdateManualActivity = useCallback(async (activityData, dateKey) => {
    const [, updateErr] = await updateActivityInDatabase(dateKey, activityData.id, activityData);
    if (updateErr) {
      console.error('Failed to update activity:', updateErr);
    }
  }, [updateActivityInDatabase]);

  /**
   * Removes an activity - handles both manual and original activities.
   * Manual activities are deleted, original activities are soft-deleted.
   * @param {string} activityId - The ID of the activity to remove
   * @param {string} dateKey - The date key for the activity
   */
  const handleRemoveActivity = useCallback(async (activityId, dateKey) => {
    // CRITICAL PATH: Determine if activity is manual or original
    if (isManualActivityId(activityId)) {
      // Manual activity - remove from database
      const [, removeErr] = await removeActivityFromDatabase(dateKey, activityId);
      if (removeErr) {
        console.error('Failed to remove activity:', removeErr);
      }
    } else {
      // Original activity - add to soft-deleted list
      const [, deleteErr] = await deleteOriginalActivityFromDatabase(dateKey, activityId);
      if (deleteErr) {
        console.error('Failed to remove activity:', deleteErr);
      }
    }
  }, [removeActivityFromDatabase, deleteOriginalActivityFromDatabase]);

  // ============================================================================
  // BUDGET CALCULATIONS
  // ============================================================================

  /**
   * Calculates total costs across all days, with proper deduplication.
   * Aggregates costs from travel, shelter, activities, and manual activities.
   */
  const budgetTotals = useMemo(() => {
    const costAccumulatorByCurrency = {};
    let totalUnbookedItemCount = 0;
    let totalCostInUSD = 0;
    
    // Track segment IDs we've already counted to avoid duplicates
    const countedCostIdentifiers = new Set();
    
    // CRITICAL PATH: Iterate through all days to aggregate costs
    parsedItineraryDays.forEach(dayEntry => {
      // Aggregate costs from travel segments (only count each segment once)
      dayEntry.travel?.forEach(travelSegment => {
        if (travelSegment.estimatedCost && travelSegment.currency && travelSegment.id) {
          if (!countedCostIdentifiers.has(travelSegment.id)) {
            countedCostIdentifiers.add(travelSegment.id);
            const currencyCode = travelSegment.currency;
            costAccumulatorByCurrency[currencyCode] = (costAccumulatorByCurrency[currencyCode] || 0) + travelSegment.estimatedCost;
            totalCostInUSD += convertCurrencyToUSD(travelSegment.estimatedCost, currencyCode);
          }
        }
      });
      
      // Aggregate costs from shelter - only count on first day of stay
      if (dayEntry.shelter?.estimatedCost && dayEntry.shelter?.currency) {
        const isFirstDayOfMultiDayStay = !dayEntry.shelter.isMultiDayStay || dayEntry.shelter.dayOfStay === 1;
        const shelterCostId = generateShelterCostIdentifier(dayEntry.shelter);
        
        if (isFirstDayOfMultiDayStay && !countedCostIdentifiers.has(shelterCostId)) {
          countedCostIdentifiers.add(shelterCostId);
          const currencyCode = dayEntry.shelter.currency;
          costAccumulatorByCurrency[currencyCode] = (costAccumulatorByCurrency[currencyCode] || 0) + dayEntry.shelter.estimatedCost;
          totalCostInUSD += convertCurrencyToUSD(dayEntry.shelter.estimatedCost, currencyCode);
        }
      }
      
      // Aggregate costs from existing activities
      dayEntry.activities?.forEach(activityItem => {
        if (activityItem.estimatedCost && activityItem.currency) {
          const activityCostId = generateActivityCostIdentifier(activityItem, dayEntry.dateKey);
          // Skip if this activity was soft-deleted
          if (deletedActivityIdsByDate[dayEntry.dateKey]?.includes(activityCostId)) return;
          if (!countedCostIdentifiers.has(activityCostId)) {
            countedCostIdentifiers.add(activityCostId);
            const currencyCode = activityItem.currency;
            costAccumulatorByCurrency[currencyCode] = (costAccumulatorByCurrency[currencyCode] || 0) + activityItem.estimatedCost;
            totalCostInUSD += convertCurrencyToUSD(activityItem.estimatedCost, currencyCode);
          }
        }
      });
      
      // Count unbooked items
      if (dayEntry.metadata?.unbootedCount) {
        totalUnbookedItemCount += dayEntry.metadata.unbootedCount;
      }
    });
    
    // Aggregate costs from manually-added activities
    Object.entries(manualActivitiesLookup).forEach(([dateKey, activitiesForDate]) => {
      activitiesForDate.forEach(manualActivity => {
        if (manualActivity.estimatedCost && manualActivity.currency) {
          const currencyCode = manualActivity.currency;
          costAccumulatorByCurrency[currencyCode] = (costAccumulatorByCurrency[currencyCode] || 0) + manualActivity.estimatedCost;
          totalCostInUSD += convertCurrencyToUSD(manualActivity.estimatedCost, currencyCode);
        }
      });
    });
    
    // Calculate budget summary values
    const totalBudgetAmount = tripBudgetConfig.total || 3500;
    const remainingBudgetAmount = totalBudgetAmount - totalCostInUSD;
    const budgetUsedPercentage = (totalCostInUSD / totalBudgetAmount) * 100;
    
    return { 
      costByCurrency: costAccumulatorByCurrency, 
      totalUnbooked: totalUnbookedItemCount, 
      totalUSD: totalCostInUSD, 
      budget: totalBudgetAmount, 
      remaining: remainingBudgetAmount, 
      percentUsed: budgetUsedPercentage 
    };
  }, [manualActivitiesLookup, deletedActivityIdsByDate, parsedItineraryDays, tripBudgetConfig]);

  /**
   * Formatted trip date range for header display.
   */
  const tripDateRangeDisplay = useMemo(() => {
    return calculateTripDateRangeDisplay(parsedItineraryDays);
  }, [parsedItineraryDays]);

  /**
   * Filtered itinerary based on current search query.
   */
  const filteredItineraryDays = useMemo(() => {
    return filterItineraryBySearchQuery(parsedItineraryDays, searchQueryText);
  }, [searchQueryText, parsedItineraryDays]);

  // ============================================================================
  // UI TOGGLE HANDLERS
  // ============================================================================

  /**
   * Toggles the expanded state of a day card.
   * Uses functional state update to avoid stale closure issues.
   * @param {string} dayKey - The date key of the day to toggle
   */
  const toggleDayExpanded = useCallback((dayKey) => {
    setExpandedDayKeys(prevExpanded => {
      const updatedExpandedDays = new Set(prevExpanded);
      if (updatedExpandedDays.has(dayKey)) {
        updatedExpandedDays.delete(dayKey);
      } else {
        updatedExpandedDays.add(dayKey);
      }
      return updatedExpandedDays;
    });
  }, []);

  /**
   * Toggles the expanded state of a section within a day.
   * Uses functional state update to avoid stale closure issues.
   * @param {string} dayKey - The date key of the day
   * @param {string} sectionName - The name of the section to toggle
   */
  const toggleSectionExpanded = useCallback((dayKey, sectionName) => {
    const compositeKey = `${dayKey}:${sectionName}`;
    setExpandedSectionKeys(prevExpanded => {
      const updatedExpandedSections = new Set(prevExpanded);
      if (updatedExpandedSections.has(compositeKey)) {
        updatedExpandedSections.delete(compositeKey);
      } else {
        updatedExpandedSections.add(compositeKey);
      }
      return updatedExpandedSections;
    });
  }, []);

  /**
   * Handles date navigation click - expands only the clicked day.
   * Replaces previous selection to show only one expanded day.
   * Also expands all sections within the clicked day.
   * @param {string} dayKey - The date key to navigate to
   */
  const handleDateNavigationClick = useCallback((dayKey) => {
    // Replace with only the clicked day (clear previous selections)
    setExpandedDayKeys(new Set([dayKey]));
    
    // Expand all sections for the clicked day
    const sectionNames = ['travel', 'shelter', 'meals', 'activities'];
    const newExpandedSections = new Set(
      sectionNames.map(section => `${dayKey}:${section}`)
    );
    setExpandedSectionKeys(newExpandedSections);
  }, []);

  // ============================================================================
  // CONDITIONAL RENDERS (Loading, Setup, Error States)
  // ============================================================================

  // Show loading state while IndexedDB initializes
  if (isDatabaseLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading your itinerary...</p>
          <button
            onClick={async () => {
              if (confirm('Reset all data and start fresh?')) {
                const [, clearErr] = await clearAllData();
                if (clearErr) {
                  console.error('Failed to clear data:', clearErr);
                  return;
                }
                window.location.reload();
              }
            }}
            className="mt-4 px-4 py-2 text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            Reset Data
          </button>
        </div>
      </div>
    );
  }

  // Show setup wizard on first launch
  if (needsSetupWizard) {
    return (
      <SetupWizard 
        onComplete={completeSetupWizard}
        onImportJson={importJsonToDatabase}
        onReset={resetAllDatabaseData}
      />
    );
  }

  // Show error state if IndexedDB failed
  if (databaseError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-red-400">Failed to load itinerary data</p>
          <p className="text-zinc-500 text-sm">{databaseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      {/* Date Navigation Sidebar - Right side */}
      <DateNavigation
        days={filteredItineraryDays}
        todayDateKey={todayDateKey}
        expandedDayKeys={expandedDayKeys}
        onDateClick={handleDateNavigationClick}
      />
      
      {/* ================================================================
          HEADER SECTION
          ================================================================ */}
      <div className="max-w-6xl mx-auto lg:mr-32 mb-6 md:mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">✈️ {tripDisplayName}</h1>
            <p className="text-sm md:text-base text-zinc-400 mb-4 md:mb-6">{tripDateRangeDisplay}</p>
          </div>
          <button
            onClick={async () => {
              if (confirm('Reset all data? You will need to upload your JSON file again.')) {
                const [, clearErr] = await clearAllData();
                if (clearErr) {
                  console.error('Failed to clear data:', clearErr);
                  return;
                }
                window.location.reload();
              }
            }}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded-lg transition-colors border border-zinc-800 hover:border-red-500/30"
          >
            Reset
          </button>
        </div>

        {/* ================================================================
            BUDGET TRACKER WIDGET
            ================================================================ */}
        <div className="bg-zinc-900/80 border border-zinc-700 rounded-xl md:rounded-2xl p-4 md:p-5 mb-4 md:mb-6">
          {/* Budget Header */}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
              <span className="text-sm md:text-base font-semibold text-zinc-200">Trip Budget</span>
            </div>
            <span className="text-lg md:text-2xl font-bold text-white">${budgetTotals.budget.toLocaleString()} USD</span>
          </div>
          
          {/* Budget Progress Bar */}
          <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div 
              className={classNames(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                getBudgetProgressBarColorClass(budgetTotals.percentUsed)
              )}
              style={{ width: `${Math.min(budgetTotals.percentUsed, 100)}%` }}
            />
          </div>
          
          {/* Budget Statistics Row */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Spent</div>
              <div className="text-base md:text-lg font-bold text-amber-400">
                ${Math.round(budgetTotals.totalUSD).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Remaining</div>
              <div className={classNames(
                "text-base md:text-lg font-bold",
                getRemainingBudgetColorClass(budgetTotals.remaining)
              )}>
                ${Math.round(budgetTotals.remaining).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Used</div>
              <div className={classNames(
                "text-base md:text-lg font-bold",
                getPercentUsedColorClass(budgetTotals.percentUsed)
              )}>
                {Math.round(budgetTotals.percentUsed)}%
              </div>
            </div>
          </div>
          
          {/* Currency Breakdown Section */}
          {Object.keys(budgetTotals.costByCurrency).length > 0 && (
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 mb-2">By Currency</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(budgetTotals.costByCurrency).map(([currencyCode, currencyAmount]) => (
                  <span key={currencyCode} className="px-2 py-1 bg-zinc-800 rounded-lg text-xs md:text-sm">
                    <span className="text-zinc-400">{currencyCode}:</span>{' '}
                    <span className="text-zinc-200 font-medium">{currencyAmount.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================
            STATS CARDS ROW
            ================================================================ */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Items to Book Card */}
          <div className={classNames(
            "border rounded-xl p-3 md:p-4",
            budgetTotals.totalUnbooked > 0 
              ? "bg-red-950/40 border-red-800/60" 
              : "bg-zinc-900/60 border-zinc-800"
          )}>
            <div className="flex items-center gap-2 text-zinc-400 text-xs md:text-sm mb-1">
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
              <span>Items to Book</span>
            </div>
            <div className={classNames(
              "text-lg md:text-xl font-bold",
              budgetTotals.totalUnbooked > 0 ? "text-red-400" : "text-emerald-400"
            )}>
              {budgetTotals.totalUnbooked > 0 ? `${budgetTotals.totalUnbooked} items` : 'All booked ✓'}
            </div>
          </div>

          {/* Trip Duration Card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs md:text-sm mb-1">
              <span>📅</span>
              <span>Trip Duration</span>
            </div>
            <div className="text-lg md:text-xl font-bold text-sky-400">
              {parsedItineraryDays.length} days
            </div>
          </div>
        </div>

        {/* ================================================================
            CONTROLS SECTION (Search & Filters)
            ================================================================ */}
        <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by date, location..."
              value={searchQueryText}
              onChange={(changeEvent) => setSearchQueryText(changeEvent.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setAreBackupPlansVisible(!areBackupPlansVisible)}
              className={classNames(
                "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition",
                areBackupPlansVisible
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              )}
            >
              {areBackupPlansVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{areBackupPlansVisible ? "Hide Backup Plans" : "Show Backup Plans"}</span>
              <span className="sm:hidden">{areBackupPlansVisible ? "Hide" : "Backups"}</span>
            </button>
          </div>

          {/* Filter Summary */}
          <div className="text-xs md:text-sm text-zinc-400">
            Showing {filteredItineraryDays.length} of {parsedItineraryDays.length} days
          </div>
        </div>
      </div>

      {/* ================================================================
          DAY CARDS LIST
          ================================================================ */}
      <div className="max-w-6xl mx-auto lg:mr-32 space-y-4 md:space-y-6">
        {filteredItineraryDays.map((dayEntry) => (
          <DayCard
            key={dayEntry.dateKey}
            day={dayEntry}
            isExpanded={expandedDayKeys.has(dayEntry.dateKey)}
            onToggle={() => toggleDayExpanded(dayEntry.dateKey)}
            expandedSections={expandedSectionKeys}
            onToggleSection={(sectionName) =>
              toggleSectionExpanded(dayEntry.dateKey, sectionName)
            }
            showBackupPlans={areBackupPlansVisible}
            manualActivities={manualActivitiesLookup[dayEntry.dateKey] || EMPTY_ARRAY}
            deletedActivityIds={deletedActivityIdsByDate[dayEntry.dateKey] || EMPTY_ARRAY}
            onAddActivity={handleAddManualActivity}
            onRemoveActivity={handleRemoveActivity}
            onUpdateActivity={handleUpdateManualActivity}
            todayDateKey={todayDateKey}
          />
        ))}

        {/* Empty State */}
        {filteredItineraryDays.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-lg">No days match your search.</p>
            <p className="text-sm mt-2">Try adjusting your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
