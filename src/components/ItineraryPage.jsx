import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Eye, EyeOff, DollarSign, AlertCircle, Wallet, TrendingDown } from "lucide-react";
import { ITINERARY_DAYS, TRIP_BUDGET, TRIP_NAME } from "../data/itinerary";
import { DayCard } from "./DayCard";
import { classNames } from "../utils/classNames";

// Local storage key for persisting manual activities
const STORAGE_KEY = 'travel_iten_manual_activities';

// Load manual activities from localStorage
const loadManualActivities = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save manual activities to localStorage
const saveManualActivities = (activities) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch (e) {
    console.error('Failed to save activities:', e);
  }
};

export function ItineraryPage() {
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [showBackupPlans, setShowBackupPlans] = useState(false);
  const [query, setQuery] = useState("");
  
  // Manual activities state - persisted to localStorage
  const [manualActivities, setManualActivities] = useState(loadManualActivities);

  // Auto-expand today's date on page load
  useEffect(() => {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Check if today exists in the itinerary
    const todayExists = ITINERARY_DAYS.some(day => day.dateKey === todayKey);
    
    if (todayExists) {
      setExpandedDays(new Set([todayKey]));
      
      // Scroll to today's card after a brief delay for render
      setTimeout(() => {
        const todayElement = document.getElementById(`day-${todayKey}`);
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  // Add a new manual activity for a specific date
  const addManualActivity = useCallback((activity, dateKey) => {
    setManualActivities(prev => {
      const updated = {
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), activity]
      };
      saveManualActivities(updated);
      return updated;
    });
  }, []);

  // Remove a manual activity
  const removeManualActivity = useCallback((activityId, dateKey) => {
    setManualActivities(prev => {
      const updated = {
        ...prev,
        [dateKey]: (prev[dateKey] || []).filter(a => a.id !== activityId)
      };
      saveManualActivities(updated);
      return updated;
    });
  }, []);

  // Calculate total costs across all days
  const totals = useMemo(() => {
    const costByCurrency = {};
    let totalUnbooked = 0;
    let totalUSD = 0;
    
    // Track segment IDs we've already counted to avoid duplicates
    const countedSegments = new Set();
    
    // Approximate exchange rates for budget calculation
    const exchangeRates = {
      'USD': 1,
      'PHP': 0.018,  // ~56 PHP per USD
      'JPY': 0.0067  // ~150 JPY per USD
    };
    
    ITINERARY_DAYS.forEach(day => {
      // Aggregate costs from travel segments (only count each segment once)
      day.travel?.forEach(t => {
        if (t.estimatedCost && t.currency && t.id && !countedSegments.has(t.id)) {
          countedSegments.add(t.id);
          const currency = t.currency;
          costByCurrency[currency] = (costByCurrency[currency] || 0) + t.estimatedCost;
          totalUSD += t.estimatedCost * (exchangeRates[currency] || 1);
        }
      });
      
      // Aggregate costs from shelter - only count on first day of stay (dayOfStay === 1)
      if (day.shelter?.estimatedCost && day.shelter?.currency) {
        // Only count shelter cost once - on the first day of stay
        const isFirstDayOfStay = !day.shelter.isMultiDayStay || day.shelter.dayOfStay === 1;
        const shelterId = `shelter-${day.shelter.name}-${day.shelter.estimatedCost}`;
        
        if (isFirstDayOfStay && !countedSegments.has(shelterId)) {
          countedSegments.add(shelterId);
          const currency = day.shelter.currency;
          costByCurrency[currency] = (costByCurrency[currency] || 0) + day.shelter.estimatedCost;
          totalUSD += day.shelter.estimatedCost * (exchangeRates[currency] || 1);
        }
      }
      
      if (day.metadata?.unbootedCount) {
        totalUnbooked += day.metadata.unbootedCount;
      }
    });
    
    const budget = TRIP_BUDGET.total || 3500;
    const remaining = budget - totalUSD;
    const percentUsed = (totalUSD / budget) * 100;
    
    return { costByCurrency, totalUnbooked, totalUSD, budget, remaining, percentUsed };
  }, []);

  // Format currency display
  const formatCosts = (costByCurrency) => {
    return Object.entries(costByCurrency)
      .filter(([_, amount]) => amount > 0)
      .map(([currency, amount]) => `${amount.toLocaleString()} ${currency}`)
      .join(' + ');
  };

  // Filtered itinerary based on search query
  const filteredItinerary = useMemo(() => {
    if (!query.trim()) return ITINERARY_DAYS;

    const lowerQuery = query.toLowerCase();
    return ITINERARY_DAYS.filter((day) => {
      return (
        day.dateDisplay.toLowerCase().includes(lowerQuery) ||
        day.summary.toLowerCase().includes(lowerQuery) ||
        day.timezone.toLowerCase().includes(lowerQuery)
      );
    });
  }, [query]);

  // Toggle day expanded state
  const toggleDay = (dayKey) => {
    const newSet = new Set(expandedDays);
    if (newSet.has(dayKey)) {
      newSet.delete(dayKey);
    } else {
      newSet.add(dayKey);
    }
    setExpandedDays(newSet);
  };

  // Toggle section expanded state (format: "dayKey:sectionName")
  const toggleSection = (dayKey, sectionName) => {
    const key = `${dayKey}:${sectionName}`;
    const newSet = new Set(expandedSections);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedSections(newSet);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">✈️ {TRIP_NAME}</h1>
        <p className="text-zinc-400 mb-6">Jan 30 – Feb 16, 2026</p>

        {/* Budget Tracker Widget */}
        <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold text-zinc-200">Trip Budget</span>
            </div>
            <span className="text-2xl font-bold text-white">${totals.budget.toLocaleString()} USD</span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div 
              className={classNames(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                totals.percentUsed > 100 ? "bg-red-500" :
                totals.percentUsed > 80 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(totals.percentUsed, 100)}%` }}
            />
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Spent</div>
              <div className="text-lg font-bold text-amber-400">
                ${Math.round(totals.totalUSD).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Remaining</div>
              <div className={classNames(
                "text-lg font-bold",
                totals.remaining >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                ${Math.round(totals.remaining).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Used</div>
              <div className={classNames(
                "text-lg font-bold",
                totals.percentUsed > 100 ? "text-red-400" :
                totals.percentUsed > 80 ? "text-amber-400" : "text-zinc-300"
              )}>
                {Math.round(totals.percentUsed)}%
              </div>
            </div>
          </div>
          
          {/* Currency Breakdown */}
          {Object.keys(totals.costByCurrency).length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 mb-2">By Currency</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(totals.costByCurrency).map(([currency, amount]) => (
                  <span key={currency} className="px-2 py-1 bg-zinc-800 rounded-lg text-sm">
                    <span className="text-zinc-400">{currency}:</span>{' '}
                    <span className="text-zinc-200 font-medium">{amount.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Items to Book */}
          <div className={classNames(
            "border rounded-xl p-4",
            totals.totalUnbooked > 0 
              ? "bg-red-950/40 border-red-800/60" 
              : "bg-zinc-900/60 border-zinc-800"
          )}>
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <AlertCircle className="h-4 w-4" />
              <span>Items to Book</span>
            </div>
            <div className={classNames(
              "text-xl font-bold",
              totals.totalUnbooked > 0 ? "text-red-400" : "text-emerald-400"
            )}>
              {totals.totalUnbooked > 0 ? `${totals.totalUnbooked} items` : 'All booked ✓'}
            </div>
          </div>

          {/* Trip Duration */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <span>📅</span>
              <span>Trip Duration</span>
            </div>
            <div className="text-xl font-bold text-sky-400">
              {ITINERARY_DAYS.length} days
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by date, location, or timezone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                setShowBackupPlans(!showBackupPlans)
              }
              className={classNames(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition",
                showBackupPlans
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              )}
            >
              {showBackupPlans ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {showBackupPlans ? "Hide Backup Plans" : "Show Backup Plans"}
            </button>
          </div>

          {/* Summary */}
          <div className="text-sm text-zinc-400">
            Showing {filteredItinerary.length} of {ITINERARY_DAYS.length} days
          </div>
        </div>
      </div>

      {/* Days list */}
      <div className="max-w-6xl mx-auto space-y-6">
        {filteredItinerary.map((day) => (
          <DayCard
            key={day.dateKey}
            day={day}
            isExpanded={expandedDays.has(day.dateKey)}
            onToggle={() => toggleDay(day.dateKey)}
            expandedSections={expandedSections}
            onToggleSection={(sectionName) =>
              toggleSection(day.dateKey, sectionName)
            }
            showBackupPlans={showBackupPlans}
            manualActivities={manualActivities[day.dateKey] || []}
            onAddActivity={addManualActivity}
            onRemoveActivity={removeManualActivity}
          />
        ))}

        {filteredItinerary.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-lg">No days match your search.</p>
            <p className="text-sm mt-2">Try adjusting your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
