/**
 * @fileoverview Meals section component displaying meal plans for a day
 * with expandable/collapsible list view.
 * 
 * @description Features include:
 * - Collapsible section with meal count badge
 * - Meal type, location, time, and details display
 * - Amber color theme for meal-related content
 */

import { memo } from "react";
import { ChevronDown, ChevronRight, Utensils } from "lucide-react";
import { classNames } from "../../utils/classNames";

/* ============================================================================
   TYPE DEFINITIONS
   ============================================================================ */

/**
 * @typedef {Object} Meal
 * @property {string} type - Meal type (e.g., "Breakfast", "Lunch", "Dinner")
 * @property {string} [location] - Restaurant or venue name
 * @property {string} [time] - Scheduled meal time
 * @property {string} [details] - Additional meal details or notes
 */

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * Expandable section displaying planned meals for a day
 * 
 * @component
 * @param {Object} props
 * @param {Array<Meal>} props.meals - Array of meal objects to display
 * @param {boolean} props.isExpanded - Whether the section is expanded
 * @param {Function} props.onToggle - Callback to toggle section expansion
 * @returns {JSX.Element|null} Meals section or null if no meals
 */
export const MealsSection = memo(function MealsSection({ meals, isExpanded, onToggle }) {
  // Early return if no meals to display
  if (!meals || meals.length === 0) return null;

  const mealCount = meals.length;

  return (
    <div className="border border-amber-900/50 rounded-lg overflow-hidden bg-amber-950/20">
      {/* Section Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 md:px-4 py-2 md:py-2.5 hover:bg-amber-900/20 transition flex items-center justify-between bg-amber-900/30"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Utensils className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
          <span className="text-sm md:text-base font-medium text-amber-200">
            🍽️ Meals <span className="text-amber-500">({mealCount})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
        ) : (
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
        )}
      </button>

      {/* Expandable Meal List */}
      {isExpanded && (
        <div className="divide-y divide-amber-900/30 bg-amber-950/10 slide-down">
          {meals.map((mealItem, mealIndex) => (
            <div key={mealIndex} className="px-3 md:px-4 py-2 md:py-3">
              <div className="flex items-start justify-between gap-2 md:gap-3">
                {/* Meal Details */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm md:text-base font-medium text-amber-100">
                    {mealItem.type}
                  </div>
                  {mealItem.location && (
                    <div className="text-xs md:text-sm text-amber-400 mt-0.5 truncate">
                      📍 {mealItem.location}
                    </div>
                  )}
                  {mealItem.details && (
                    <div className="text-xs md:text-sm text-amber-300 mt-0.5">
                      {mealItem.details}
                    </div>
                  )}
                </div>
                {/* Meal Time */}
                {mealItem.time && (
                  <div className="text-xs md:text-sm text-amber-400 whitespace-nowrap flex-shrink-0">
                    ⏰ {mealItem.time}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
