/**
 * @fileoverview Activities section component displaying a list of activities
 * with mobile-optimized card layout and desktop-optimized row layout with map.
 * 
 * @description Features include:
 * - Responsive layout (mobile cards vs desktop rows + map)
 * - Activity categorization with color-coded badges
 * - Priority-based visual styling
 * - Google Maps integration for locations
 * - Edit and delete functionality for manual activities
 * - Copy location to clipboard
 */

import { useState, memo, useCallback } from "react";
import { ChevronDown, ChevronRight, MapPin, X, ExternalLink, Clock, DollarSign, Pencil, Trash2, Copy, Check } from "lucide-react";
import { classNames } from "../../utils/classNames";
import { ActivityMapPreview } from "../ActivityMapPreview";
import DeleteConfirmModal from "../DeleteConfirmModal";

/* ============================================================================
   STYLE CONSTANTS
   ============================================================================ */

/**
 * Priority-based styling classes for activity cards
 * @constant {Object.<string, string>}
 */
const ACTIVITY_PRIORITY_STYLES = {
  high: "border-l-amber-500 bg-amber-950/20",
  medium: "border-l-teal-500 bg-teal-950/10",
  low: "border-l-zinc-600 bg-zinc-900/20"
};

/**
 * Category-based color classes for activity badges
 * @constant {Object.<string, string>}
 */
const ACTIVITY_CATEGORY_COLORS = {
  Sports: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  Food: "bg-orange-900/40 text-orange-300 border-orange-700/50",
  Sightseeing: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  Shopping: "bg-pink-900/40 text-pink-300 border-pink-700/50",
  Logistics: "bg-zinc-800/60 text-zinc-300 border-zinc-600/50",
  Relaxation: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  Family: "bg-rose-900/40 text-rose-300 border-rose-700/50",
  Rest: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
  Entertainment: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  Cultural: "bg-red-900/40 text-red-300 border-red-700/50",
  Personal: "bg-slate-900/40 text-slate-300 border-slate-600/50",
  Transport: "bg-sky-900/40 text-sky-300 border-sky-700/50",
  Outdoor: "bg-green-900/40 text-green-300 border-green-700/50",
  Nightlife: "bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700/50"
};

/**
 * Default fallback category styling
 * @constant {string}
 */
const DEFAULT_CATEGORY_STYLE = "bg-zinc-800 text-zinc-300 border-zinc-600/50";

/**
 * Copy feedback timeout in milliseconds
 * @constant {number}
 */
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/* ============================================================================
   PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Generates a Google Maps URL for an activity location
 * @pure
 * @param {Object} activity - Activity object with location and coordinates
 * @returns {string} Google Maps search URL
 */
const buildGoogleMapsUrlForActivity = (activity) => {
  const searchQuery = encodeURIComponent(activity.location || activity.name);
  
  if (activity.coordinates?.lat && activity.coordinates?.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${searchQuery}&center=${activity.coordinates.lat},${activity.coordinates.lng}`;
  }
  
  // Fallback to search by name/location only
  return `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
};

/**
 * Calculates container height and scroll behavior based on item count
 * @pure
 * @param {number} itemCount - Number of activity items
 * @returns {{containerHeight: number, needsScrolling: boolean}} Height config
 */
const calculateContainerDimensions = (itemCount) => {
  // Height based on item count: 1 item = 100px, 2 items = 200px, 3+ items = 300px max
  const containerHeight = itemCount === 1 ? 100 : itemCount === 2 ? 200 : 300;
  const needsScrolling = itemCount >= 3;
  
  return { containerHeight, needsScrolling };
};

/**
 * Gets priority style classes for an activity
 * @pure
 * @param {string} [priority] - Activity priority level
 * @returns {string} Tailwind CSS classes
 */
const getPriorityStyleClasses = (priority) => {
  return ACTIVITY_PRIORITY_STYLES[priority] || ACTIVITY_PRIORITY_STYLES.medium;
};

/**
 * Gets category color classes for an activity badge
 * @pure
 * @param {string} [category] - Activity category
 * @returns {string} Tailwind CSS classes
 */
const getCategoryStyleClasses = (category) => {
  return ACTIVITY_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_STYLE;
};

/**
 * Checks if an activity was manually added by the user
 * @pure
 * @param {Object} activity - Activity object with id
 * @param {Array<string>} manualActivityIdList - List of manually added activity IDs
 * @returns {boolean} True if activity was manually added
 */
const isManuallyAddedActivity = (activity, manualActivityIdList) => {
  return manualActivityIdList.includes(activity.id);
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * @typedef {Object} Activity
 * @property {string} [id] - Unique activity identifier
 * @property {string} name - Activity name
 * @property {string} [icon] - Emoji icon for the activity
 * @property {string} [location] - Location name/address
 * @property {string} [category] - Activity category
 * @property {string} [priority] - Priority level (high/medium/low)
 * @property {string} [timeStart] - Start time
 * @property {string} [timeEnd] - End time
 * @property {string} [time] - Alternative time field
 * @property {number} [estimatedCost] - Estimated cost amount
 * @property {string} [currency] - Currency code
 * @property {{lat: number, lng: number}} [coordinates] - GPS coordinates
 */

/**
 * Expandable section displaying a list of activities with map integration
 * 
 * @component
 * @param {Object} props
 * @param {Array<Activity>} props.items - Array of activity items to display
 * @param {boolean} props.isExpanded - Whether the section is expanded
 * @param {Function} props.onToggle - Callback to toggle section expansion
 * @param {Array<string>} [props.manualActivityIds=[]] - IDs of user-added activities
 * @param {Function} [props.onRemoveActivity] - Callback to remove an activity
 * @param {Function} [props.onEditActivity] - Callback to edit an activity
 * @returns {JSX.Element|null} Activities section or null if no items
 */
export const ActivitiesSection = memo(function ActivitiesSection({ 
  items, 
  isExpanded, 
  onToggle,
  manualActivityIds = [],
  onRemoveActivity,
  onEditActivity
}) {
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({ isOpen: false, activity: null });
  const [copiedLocationActivityId, setCopiedLocationActivityId] = useState(null);

  // Early return if no activities to display
  if (!items || items.length === 0) return null;

  /**
   * Handles copying activity location to clipboard
   * @param {Event} event - Click event
   * @param {Activity} activity - Activity with location to copy
   */
  const handleCopyLocationToClipboard = useCallback(async (event, activity) => {
    event.stopPropagation();
    if (!activity.location) return;

    const [, copyErr] = await navigator.clipboard.writeText(activity.location).then(
      () => [undefined, null],
      (error) => [null, error instanceof Error ? error : new Error(String(error))]
    );
    
    if (copyErr) {
      console.error('Failed to copy location:', copyErr);
      return;
    }
    
    setCopiedLocationActivityId(activity.id);
    setTimeout(() => setCopiedLocationActivityId(null), COPY_FEEDBACK_TIMEOUT_MS);
  }, []);

  /**
   * Opens the delete confirmation modal for an activity
   * @param {Event} event - Click event
   * @param {Activity} activity - Activity to potentially delete
   */
  const handleOpenDeleteConfirmation = useCallback((event, activity) => {
    event.stopPropagation();
    setDeleteConfirmationModal({ isOpen: true, activity });
  }, []);

  /**
   * Handles the confirmed deletion of an activity
   */
  const handleConfirmActivityDeletion = useCallback(() => {
    if (deleteConfirmationModal.activity && onRemoveActivity) {
      onRemoveActivity(deleteConfirmationModal.activity.id);
    }
    setDeleteConfirmationModal({ isOpen: false, activity: null });
  }, [deleteConfirmationModal.activity, onRemoveActivity]);

  return (
    <div className="border border-teal-900/50 rounded-lg overflow-hidden bg-teal-950/20">
      {/* Section Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3.5 md:py-3 hover:bg-teal-900/20 transition flex items-center justify-between bg-teal-900/30 min-h-[48px]"
      >
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-teal-400" />
          <span className="text-sm md:text-base font-medium text-teal-200">
            🎯 Activities <span className="text-teal-500">({items.length})</span>
          </span>
        </div>
        <div className="p-1">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-teal-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-teal-400" />
          )}
        </div>
      </button>

      {/* Expandable Content Section */}
      {isExpanded && (() => {
        const { containerHeight, needsScrolling } = calculateContainerDimensions(items.length);
        
        return (
        <div className="p-3 md:p-4 bg-teal-950/10 slide-down">
          {/* Two Column Layout: Activities (60%) + Map (40%) - stacked on mobile */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* LEFT COLUMN - Activity List with optional scroll */}
            <div 
              className={`w-full md:w-[60%] min-w-0 space-y-2.5 md:space-y-2 md:pr-2 ${needsScrolling ? 'overflow-y-auto' : ''}`}
              style={needsScrolling ? { maxHeight: '350px' } : {}}
            >
              {items.map((activity, activityIndex) => {
                const isUserAddedActivity = isManuallyAddedActivity(activity, manualActivityIds);
                const priorityClasses = getPriorityStyleClasses(activity.priority);
                const googleMapsUrl = buildGoogleMapsUrlForActivity(activity);
                const activityDisplayNumber = activityIndex + 1;

                return (
                <div 
                  key={activity.id || activityIndex} 
                  className={classNames(
                    "rounded-lg relative",
                    /* Mobile: card style, Desktop: compact row */
                    "md:px-4 md:py-3 md:border-l-3",
                    /* Mobile styles */
                    "border border-teal-800/50 md:border-0 md:border-l-3",
                    priorityClasses,
                    isUserAddedActivity && "ring-1 ring-blue-700/50"
                  )}
                >
                  {/* MOBILE LAYOUT */}
                  <div className="md:hidden">
                    {/* Mobile Header: Number + Name + Time */}
                    <div className="flex items-center gap-2.5 p-3 pb-2.5 border-b border-teal-800/30">
                      <span className="text-sm font-bold bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                        {activityDisplayNumber}
                      </span>
                      {activity.icon && <span className="text-xl">{activity.icon}</span>}
                      <span className="flex-1 font-semibold text-teal-100 text-sm truncate">
                        {activity.name}
                      </span>
                      {(activity.timeStart || activity.time) && (
                        <span className="text-xs text-teal-300 bg-teal-900/60 px-2.5 py-1 rounded-full flex-shrink-0">
                          {activity.timeStart || activity.time}
                        </span>
                      )}
                    </div>
                    
                    {/* Mobile Body: Location + Tags */}
                    <div className="p-3 pt-2.5 space-y-2.5">
                      {/* Location with Google Maps link */}
                      {activity.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-teal-400 flex-shrink-0" />
                          <span className="text-xs text-teal-300 flex-1 truncate">{activity.location}</span>
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 -m-1 text-teal-500 flex items-center justify-center flex-shrink-0 min-w-[44px] min-h-[44px]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                      )}
                      
                      {/* Tags row - compact on mobile */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activity.category && (
                          <span className={classNames(
                            "text-[11px] px-2.5 py-1 rounded-full border",
                            getCategoryStyleClasses(activity.category)
                          )}>
                            {activity.category}
                          </span>
                        )}
                        {activity.estimatedCost && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                            💰 {activity.estimatedCost.toLocaleString()} {activity.currency}
                          </span>
                        )}
                        {isUserAddedActivity && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
                            ✨ Manual
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Mobile Actions Bar - 44px touch targets */}
                    <div className="flex items-center justify-end gap-1 px-2 pb-2">
                      <button
                        onClick={(event) => handleCopyLocationToClipboard(event, activity)}
                        className={classNames(
                          "p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center",
                          copiedLocationActivityId === activity.id
                            ? "text-emerald-400 bg-emerald-900/30"
                            : "text-teal-400 bg-teal-900/30 active:bg-teal-800/50"
                        )}
                      >
                        {copiedLocationActivityId === activity.id ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                      {onEditActivity && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditActivity(activity);
                          }}
                          className="p-2.5 rounded-lg bg-amber-900/40 text-amber-300 active:bg-amber-800/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Pencil size={20} />
                        </button>
                      )}
                      {onRemoveActivity && (
                        <button
                          onClick={(event) => handleOpenDeleteConfirmation(event, activity)}
                          className="p-2.5 rounded-lg bg-red-900/40 text-red-300 active:bg-red-800/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP LAYOUT */}
                  <div className="hidden md:block">
                    {/* Edit & Delete buttons - bottom right */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
                      {onEditActivity && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditActivity(activity);
                          }}
                          className="p-1.5 rounded-md bg-amber-900/50 hover:bg-amber-700/50 text-amber-300 transition-colors"
                          title="Edit activity"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onRemoveActivity && (
                        <button
                          onClick={(event) => handleOpenDeleteConfirmation(event, activity)}
                          className="p-1.5 rounded-md bg-red-900/50 hover:bg-red-700/50 text-red-300 transition-colors"
                          title="Delete activity"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    
                    {/* Activity header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Activity number badge */}
                        <span className="text-sm font-bold bg-teal-700/60 text-teal-100 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                          {activityDisplayNumber}
                        </span>
                        {activity.icon && (
                          <span className="text-lg">{activity.icon}</span>
                        )}
                        <span className="text-base font-medium text-teal-100 truncate">
                          {activity.name}
                        </span>
                      </div>
                      
                      {/* Time on right */}
                      {(activity.timeStart || activity.time) && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-900/40 border border-teal-700/50 text-sm text-teal-200 flex-shrink-0">
                          <Clock className="h-3.5 w-3.5 text-teal-400" />
                          <span>
                            {activity.timeStart || activity.time}
                            {activity.timeEnd && ` → ${activity.timeEnd}`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Tags row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {activity.category && (
                        <span className={classNames(
                          "text-sm px-2.5 py-1 rounded-full border",
                          getCategoryStyleClasses(activity.category)
                        )}>
                          {activity.category}
                        </span>
                      )}
                      {isUserAddedActivity && (
                        <span className="text-sm px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
                          ✨ Manual
                        </span>
                      )}
                      {activity.estimatedCost && (
                        <span className="flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                          <DollarSign className="h-3.5 w-3.5" />
                          {activity.estimatedCost.toLocaleString()} {activity.currency}
                        </span>
                      )}
                    </div>
                    
                    {/* Location row */}
                    {activity.location && (
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="h-4 w-4 text-teal-400 flex-shrink-0" />
                        <span className="text-sm text-teal-300 truncate">
                          {activity.location}
                        </span>
                        <button
                          onClick={(event) => handleCopyLocationToClipboard(event, activity)}
                          className={classNames(
                            "p-1 rounded transition-colors flex-shrink-0",
                            copiedLocationActivityId === activity.id
                              ? "text-emerald-400"
                              : "text-teal-500 hover:text-teal-300 hover:bg-teal-800/50"
                          )}
                          title={copiedLocationActivityId === activity.id ? "Copied!" : "Copy location"}
                        >
                          {copiedLocationActivityId === activity.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-teal-500 hover:text-teal-300 transition-colors flex-shrink-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
            
            {/* RIGHT COLUMN - Map (40% on desktop, hidden on mobile) */}
            <div className="hidden md:block w-[40%] flex-shrink-0" style={{ height: `${containerHeight}px` }}>
              <ActivityMapPreview activities={items} height={containerHeight} />
            </div>
          </div>
        </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmationModal.isOpen}
        onClose={() => setDeleteConfirmationModal({ isOpen: false, activity: null })}
        onConfirm={handleConfirmActivityDeletion}
        activityName={deleteConfirmationModal.activity?.name || ''}
      />
    </div>
  );
});
