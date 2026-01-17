/**
 * @fileoverview Date navigation sidebar component.
 * 
 * Displays all trip dates in a vertical list on the right side of the screen.
 * Features:
 * - Shows all dates with day numbers
 * - Highlights today's date
 * - Enlarges on hover
 * - Scrolls to the clicked date
 * 
 * @module components/DateNavigation
 */

import { memo, useCallback } from "react";
import { classNames } from "../utils/classNames";

/**
 * Formats a date key for short display (e.g., "Jan 15").
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {string} Formatted short date
 */
function formatShortDate(dateKey) {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Gets the day of week abbreviation.
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {string} Day abbreviation (e.g., "Mon", "Tue")
 */
function getDayOfWeek(dateKey) {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Date navigation sidebar component.
 * Shows all dates with hover effects and click-to-scroll functionality.
 * 
 * @param {Object} props
 * @param {Array} props.days - Array of day objects with dateKey property
 * @param {string} props.todayDateKey - Today's date in YYYY-MM-DD format
 * @param {Set} props.expandedDayKeys - Set of currently expanded day keys
 * @param {Function} props.onDateClick - Callback when a date is clicked
 * @returns {JSX.Element}
 */
export const DateNavigation = memo(function DateNavigation({ 
  days, 
  todayDateKey, 
  expandedDayKeys,
  onDateClick 
}) {
  /**
   * Handles clicking on a date - expands the day and scrolls to it.
   */
  const handleDateClick = useCallback((dateKey) => {
    // Call parent handler to expand the day
    onDateClick(dateKey);
    
    // Scroll to the day card
    setTimeout(() => {
      const dayCardElement = document.getElementById(`day-${dateKey}`);
      if (dayCardElement) {
        dayCardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, [onDateClick]);

  return (
    <div className="fixed right-4 top-4 bottom-4 z-40 hidden lg:flex flex-col overflow-hidden">
      {/* Label */}
      <div className="text-xs text-zinc-500 text-center mb-2 font-medium">
        Dates
      </div>
      
      {/* Date list */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {days.map((day, index) => {
          const isToday = day.dateKey === todayDateKey;
          const isExpanded = expandedDayKeys.has(day.dateKey);
          
          return (
            <button
              key={day.dateKey}
              onClick={() => handleDateClick(day.dateKey)}
              className={classNames(
                "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-right transition-all duration-200",
                "hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-black/20",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                isToday 
                  ? "bg-blue-600/20 border border-blue-500/50 text-blue-300" 
                  : isExpanded
                    ? "bg-zinc-800/80 border border-zinc-600 text-zinc-200"
                    : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100"
              )}
              title={`Day ${index + 1}: ${day.dateDisplay || formatShortDate(day.dateKey)}`}
            >
              {/* Day number badge */}
              <span className={classNames(
                "text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded",
                isToday 
                  ? "bg-blue-500/30 text-blue-200" 
                  : isExpanded
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300"
              )}>
                {index + 1}
              </span>
              
              {/* Date info - always visible */}
              <div className="flex flex-col items-end">
                <span className={classNames(
                  "text-xs font-medium transition-all duration-200",
                  "group-hover:font-semibold"
                )}>
                  {formatShortDate(day.dateKey)}
                </span>
                <span className={classNames(
                  "text-[10px] transition-all duration-200",
                  isToday ? "text-blue-400/70" : "text-zinc-500"
                )}>
                  {getDayOfWeek(day.dateKey)}
                </span>
              </div>
              
              {/* Today indicator dot */}
              {isToday && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Quick jump hint */}
      <div className="text-[10px] text-zinc-600 text-center mt-2">
        Click to jump
      </div>
    </div>
  );
});

export default DateNavigation;
