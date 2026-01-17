/**
 * @fileoverview Day Card component - displays a single day's itinerary.
 * 
 * Features:
 * - Expandable/collapsible day overview
 * - Map preview for accommodations (desktop only)
 * - Sections for travel, shelter, meals, and activities
 * - Copy-to-clipboard functionality
 * - Region badge based on timezone
 * - Today highlighting
 * - Activity management (add, edit, delete)
 * 
 * @module components/DayCard
 */

import { useState, useMemo, useCallback, memo } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Plus } from "lucide-react";
import { TravelSection } from "./sections/TravelSection";
import { ShelterSection } from "./sections/ShelterSection";
import { MealsSection } from "./sections/MealsSection";
import { ActivitiesSection } from "./sections/ActivitiesSection";
import { DayMetadata } from "./DayMetadata";
import AddActivityModal from "./AddActivityModal";
import { MapPreview } from "./MapPreview";
import { classNames } from "../utils/classNames";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Empty array constant to avoid creating new array references.
 * @constant {Array}
 */
const EMPTY_ARRAY = [];

/**
 * Section name constants for tracking expanded state.
 * @constant {Object.<string, string>}
 */
const SECTION_NAMES = {
  travel: "travel",
  shelter: "shelter",
  meals: "meals",
  activities: "activities",
};

/**
 * Region configuration for badge styling based on timezone.
 * @constant {Object.<string, {flag: string, label: string, bg: string, border: string, text: string}>}
 */
const REGION_BADGE_CONFIG = {
  'US': { flag: '🇺🇸', label: 'US', bg: 'bg-blue-900/40', border: 'border-blue-700/50', text: 'text-blue-300' },
  'PH': { flag: '🇵🇭', label: 'PH', bg: 'bg-yellow-900/40', border: 'border-yellow-700/50', text: 'text-yellow-300' },
  'JP': { flag: '🇯🇵', label: 'JP', bg: 'bg-red-900/40', border: 'border-red-700/50', text: 'text-red-300' },
};

/** @constant {number} Duration in ms to show "copied" feedback */
const COPY_FEEDBACK_DURATION_MS = 2000;

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Determines the region badge configuration based on timezone.
 * @pure
 * @param {string} timezone - The timezone display string (e.g., "ET", "JST")
 * @param {string} timezoneCode - The timezone code (e.g., "US", "JP", "PH")
 * @returns {{flag: string, label: string, bg: string, border: string, text: string}} Badge configuration
 */
function getRegionBadgeConfig(timezone, timezoneCode) {
  // Check for explicit region code first
  if (timezoneCode === 'US' || timezone?.includes('ET') || timezone?.includes('PT') || timezone?.includes('MT')) {
    return REGION_BADGE_CONFIG['US'];
  }
  if (timezoneCode === 'JP' || timezone?.includes('JST')) {
    return REGION_BADGE_CONFIG['JP'];
  }
  if (timezoneCode === 'PH' || timezone?.includes('PHT')) {
    return REGION_BADGE_CONFIG['PH'];
  }
  return REGION_BADGE_CONFIG['US']; // Default to US
}

/**
 * Builds a section key for tracking expanded state.
 * @pure
 * @param {string} dateKey - The day's date key (YYYY-MM-DD)
 * @param {string} sectionName - The section name
 * @returns {string} The composite section key
 */
function buildSectionKey(dateKey, sectionName) {
  return `${dateKey}:${sectionName}`;
}

/**
 * Gets today's date key in YYYY-MM-DD format.
 * @pure
 * @returns {string} Today's date key
 */
function getTodayDateKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Checks if a day is today.
 * @pure
 * @param {string} dateKey - The day's date key to check
 * @returns {boolean} True if the day is today
 */
function isDayToday(dateKey) {
  return dateKey === getTodayDateKey();
}

/**
 * Merges original and manual activities, filtering out deleted ones.
 * @pure
 * @param {Array} originalActivities - Activities from the original itinerary
 * @param {Array} manualActivities - User-added activities
 * @param {Array<string>} deletedActivityIds - IDs of deleted activities
 * @returns {Array} Combined and filtered activities list
 */
function mergeAndFilterActivities(originalActivities, manualActivities, deletedActivityIds) {
  const filteredOriginalActivities = (originalActivities || []).filter(
    activity => !deletedActivityIds.includes(activity.id)
  );
  return [...filteredOriginalActivities, ...manualActivities];
}

/**
 * Extracts activity IDs from a list of activities.
 * @pure
 * @param {Array} activities - List of activity objects
 * @returns {Array<string>} List of activity IDs
 */
function extractActivityIds(activities) {
  return activities.map(activity => activity.id);
}

/**
 * Gets the status emoji for a travel segment.
 * @pure
 * @param {string} status - The booking status
 * @returns {string} The corresponding emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'BOOKED': return '✅';
    case 'TO_BOOK': return '⚠️';
    default: return '📋';
  }
}

/**
 * Formats a day's itinerary as copyable plain text.
 * @pure
 * @param {Object} dayData - The day object to format
 * @returns {string} Formatted text representation of the day
 */
function formatDayAsPlainText(dayData) {
  const textLines = [];
  const regionBadge = getRegionBadgeConfig(dayData.timezone, dayData.tz);
  
  // Header Section
  textLines.push(`📅 ${dayData.dateDisplay} ${regionBadge.flag}`);
  textLines.push(`📍 ${dayData.summary}`);
  if (dayData.isInFlight) textLines.push(`✈️ In Flight (crossing date line)`);
  textLines.push('');
  
  // Metadata Section
  if (dayData.metadata) {
    const metadataInfo = dayData.metadata;
    if (metadataInfo.hasTravel) textLines.push('🛫 Travel Day');
    if (metadataInfo.locationFlags?.length > 0) {
      textLines.push(`📌 Locations: ${metadataInfo.locationFlags.join(', ')}`);
    }
    if (metadataInfo.estimatedCost > 0) {
      textLines.push(`💰 Est. Cost: ${metadataInfo.estimatedCost.toLocaleString()} ${metadataInfo.costCurrencies?.join('/')}`);
    }
    if (metadataInfo.hasUnbooked) {
      textLines.push(`⚠️ ${metadataInfo.unbootedCount} item(s) to book`);
    }
    if (metadataInfo.hasTravel || metadataInfo.estimatedCost > 0 || metadataInfo.hasUnbooked) {
      textLines.push('');
    }
  }
  
  // Travel Section
  if (dayData.travel?.length > 0) {
    textLines.push('✈️ TRAVEL:');
    dayData.travel.forEach(travelSegment => {
      const statusEmoji = getStatusEmoji(travelSegment.status);
      textLines.push(`  ${statusEmoji} ${travelSegment.route || travelSegment.location || 'Transit'}`);
      if (travelSegment.timeStart) {
        const timeDisplay = travelSegment.timeEnd 
          ? `${travelSegment.timeStart} → ${travelSegment.timeEnd}`
          : travelSegment.timeStart;
        textLines.push(`     🕐 ${timeDisplay}`);
      }
      if (travelSegment.details) textLines.push(`     ${travelSegment.details}`);
      if (travelSegment.flightNumber) {
        textLines.push(`     Flight: ${travelSegment.flightNumber} (${travelSegment.airline || ''})`);
      }
    });
    textLines.push('');
  }
  
  // Shelter Section
  if (dayData.shelter) {
    textLines.push('🏨 ACCOMMODATION:');
    textLines.push(`  ${dayData.shelter.name || 'TBD'}`);
    if (dayData.shelter.address) textLines.push(`  📍 ${dayData.shelter.address}`);
    if (dayData.shelter.notes) textLines.push(`  📝 ${dayData.shelter.notes}`);
    textLines.push('');
  }
  
  // Activities Section
  if (dayData.activities?.length > 0) {
    textLines.push('🎯 ACTIVITIES:');
    dayData.activities.forEach(activityItem => {
      textLines.push(`  • ${activityItem.details || activityItem.name || 'Activity'}`);
      if (activityItem.timeStart) {
        const timeDisplay = activityItem.timeEnd 
          ? `${activityItem.timeStart} - ${activityItem.timeEnd}`
          : activityItem.timeStart;
        textLines.push(`    🕐 ${timeDisplay}`);
      }
    });
    textLines.push('');
  }
  
  return textLines.join('\n');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * @typedef {Object} DayCardProps
 * @property {Object} day - The day data object containing all itinerary info
 * @property {boolean} isExpanded - Whether the card is currently expanded
 * @property {Function} onToggle - Callback to toggle the expanded state
 * @property {Set<string>} expandedSections - Set of currently expanded section keys
 * @property {Function} onToggleSection - Callback to toggle a section's expanded state
 * @property {boolean} showBackupPlans - Whether to show backup plan details
 * @property {Array} manualActivities - User-added activities for this day
 * @property {Array<string>} deletedActivityIds - IDs of deleted activities
 * @property {Function} onAddActivity - Callback to add a new activity
 * @property {Function} onRemoveActivity - Callback to remove an activity
 * @property {Function} onUpdateActivity - Callback to update an activity
 */

/**
 * DayCard component - displays a single day's itinerary with expandable sections.
 * 
 * Features responsive layout with:
 * - Desktop: Two-column layout with map preview
 * - Mobile: Single-column stacked layout
 * 
 * @param {DayCardProps} props - Component properties
 * @returns {JSX.Element} The day card component
 */
export const DayCard = memo(function DayCard({
  day,
  isExpanded,
  onToggle,
  expandedSections,
  onToggleSection,
  showBackupPlans,
  manualActivities,
  deletedActivityIds,
  onAddActivity,
  onRemoveActivity,
  onUpdateActivity,
  todayDateKey,
}) {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  /** @type {[boolean, Function]} Whether the copy success message is shown */
  const [isCopySuccessVisible, setIsCopySuccessVisible] = useState(false);
  
  /** @type {[boolean, Function]} Whether the add/edit activity modal is open */
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  
  /** @type {[Object|null, Function]} Activity being edited, null if adding new */
  const [activityBeingEdited, setActivityBeingEdited] = useState(null);

  // ============================================================================
  // COMPUTED VALUES (Memoized)
  // ============================================================================
  
  // CRITICAL PATH: Merge and filter activities for display
  const combinedActivitiesList = useMemo(
    () => mergeAndFilterActivities(day.activities, manualActivities, deletedActivityIds),
    [day.activities, manualActivities, deletedActivityIds]
  );

  const manualActivityIdsList = useMemo(
    () => manualActivities.length > 0 ? extractActivityIds(manualActivities) : EMPTY_ARRAY,
    [manualActivities]
  );
  
  const regionBadgeConfig = useMemo(
    () => getRegionBadgeConfig(day.timezone, day.tz),
    [day.timezone, day.tz]
  );
  
  const isDayMarkedAsToday = day.dateKey === todayDateKey;

  // ============================================================================
  // SECTION EXPANSION HELPERS
  // ============================================================================

  /**
   * Checks if a specific section is expanded.
   * @param {string} sectionName - The section name to check
   * @returns {boolean} True if the section is expanded
   */
  const checkIsSectionExpanded = useCallback((sectionName) => {
    const sectionKey = buildSectionKey(day.dateKey, sectionName);
    return expandedSections.has(sectionKey);
  }, [day.dateKey, expandedSections]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles copying the day's itinerary to clipboard.
   * @param {React.MouseEvent} clickEvent - The click event
   */
  const handleCopyToClipboard = useCallback(async (clickEvent) => {
    clickEvent.stopPropagation(); // Prevent card toggle
    const formattedText = formatDayAsPlainText(day);
    
    const [, copyErr] = await navigator.clipboard.writeText(formattedText).then(
      () => [undefined, null],
      (error) => [null, error instanceof Error ? error : new Error(String(error))]
    );
    
    if (copyErr) {
      console.error('Failed to copy:', copyErr);
      return;
    }
    
    setIsCopySuccessVisible(true);
    setTimeout(() => setIsCopySuccessVisible(false), COPY_FEEDBACK_DURATION_MS);
  }, [day]);

  /**
   * Handles adding a new activity through the modal.
   * @param {Object} activityData - The new activity data
   */
  const handleActivityAdd = useCallback((activityData) => {
    onAddActivity?.(activityData, day.dateKey);
  }, [onAddActivity, day.dateKey]);

  /**
   * Handles updating an existing activity.
   * @param {Object} activityData - The updated activity data
   */
  const handleActivityUpdate = useCallback((activityData) => {
    onUpdateActivity?.(activityData, day.dateKey);
  }, [onUpdateActivity, day.dateKey]);

  /**
   * Handles removing an activity.
   * @param {string} activityId - The ID of the activity to remove
   */
  const handleActivityRemove = useCallback((activityId) => {
    onRemoveActivity?.(activityId, day.dateKey);
  }, [onRemoveActivity, day.dateKey]);

  /**
   * Opens the modal in edit mode for a specific activity.
   * @param {Object} activityToEdit - The activity to edit
   */
  const handleActivityEdit = useCallback((activityToEdit) => {
    setActivityBeingEdited(activityToEdit);
    setIsActivityModalOpen(true);
  }, []);

  /**
   * Closes the activity modal and clears edit state.
   */
  const handleModalClose = useCallback(() => {
    setIsActivityModalOpen(false);
    setActivityBeingEdited(null);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div 
      id={`day-${day.dateKey}`}
      className={classNames(
        "rounded-xl md:rounded-2xl border",
        isDayMarkedAsToday && "ring-2 ring-blue-500 ring-offset-2 md:ring-offset-4 ring-offset-zinc-950",
        day.metadata?.hasUnbooked
          ? "border-red-600/80 bg-zinc-900 shadow-lg shadow-red-900/30"
          : "border-zinc-700 bg-zinc-900"
      )}
    >
      {/* ================================================================
          DAY HEADER - Responsive: Stack on mobile, 2-col on desktop
          ================================================================ */}
      <div
        onClick={onToggle}
        className="flex flex-col md:flex-row cursor-pointer hover:bg-zinc-800/30 transition md:min-h-[400px]"
      >
        {/* LEFT COLUMN - Info & Tags (60% on desktop) */}
        <div className="w-full md:w-[60%] p-4 md:p-8 flex flex-col justify-between">
          {/* Top Row: Chevron, Date, Today Badge, Copy, Region */}
          <div className="flex items-center justify-between mb-3 md:mb-0">
            <div className="flex items-center gap-2 md:gap-4">
              {isExpanded ? (
                <ChevronDown className="h-6 w-6 md:h-9 md:w-9 text-zinc-300" />
              ) : (
                <ChevronRight className="h-6 w-6 md:h-9 md:w-9 text-zinc-300" />
              )}
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <span className="font-bold text-lg md:text-2xl text-white">{day.dateDisplay}</span>
                {isDayMarkedAsToday && (
                  <span className="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base font-bold bg-blue-500 text-white rounded-full">
                    TODAY
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Copy Button */}
              <button
                onClick={handleCopyToClipboard}
                className={classNames(
                  "p-2 md:p-3 rounded-lg border transition-all",
                  isCopySuccessVisible
                    ? "bg-emerald-800/60 border-emerald-500/60 text-emerald-300"
                    : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                )}
                title={isCopySuccessVisible ? "Copied!" : "Copy day itinerary"}
              >
                {isCopySuccessVisible ? (
                  <Check className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Copy className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
              {/* Region Badge */}
              <div className={classNames(
                "flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-4 md:py-2 rounded-lg border text-xs md:text-base font-semibold",
                regionBadgeConfig.bg, regionBadgeConfig.border, regionBadgeConfig.text
              )}>
                <span className="text-sm md:text-lg">{regionBadgeConfig.flag}</span>
                <span className="hidden sm:inline">{day.timezone}</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Summary */}
          <div className="text-sm md:text-lg text-zinc-300 my-3 md:my-0">
            {day.summary}
            {day.isInFlight && (
              <span className="ml-2 text-sky-400 font-medium">✈️ In Flight</span>
            )}
          </div>

          {/* Bottom Row: Metadata Tags */}
          <DayMetadata day={day} />
        </div>

        {/* RIGHT COLUMN - Map Preview (40%) - Desktop only */}
        {day.shelter?.coordinates && (
          <div className="hidden md:block w-[40%] flex-shrink-0">
            <MapPreview
              coordinates={day.shelter.coordinates}
              name={day.shelter.name}
              address={day.shelter.address}
              type={day.shelter.type}
            />
          </div>
        )}
      </div>

      {/* ================================================================
          EXPANDED CONTENT - Sections
          ================================================================ */}
      {isExpanded && (
        <div className="border-t border-zinc-700 p-3 md:p-5 space-y-3 md:space-y-5 slide-down">
          {/* Travel Section */}
          <TravelSection
            items={day.travel}
            isExpanded={checkIsSectionExpanded(SECTION_NAMES.travel)}
            onToggle={() => onToggleSection(SECTION_NAMES.travel)}
            showBackupPlans={showBackupPlans}
          />

          {/* Shelter Section */}
          {day.shelter && (
            <ShelterSection
              shelter={day.shelter}
              isExpanded={checkIsSectionExpanded(SECTION_NAMES.shelter)}
              onToggle={() => onToggleSection(SECTION_NAMES.shelter)}
            />
          )}

          {/* Meals Section */}
          <MealsSection
            items={day.meals}
            isExpanded={checkIsSectionExpanded(SECTION_NAMES.meals)}
            onToggle={() => onToggleSection(SECTION_NAMES.meals)}
          />

          {/* Activities Section */}
          <ActivitiesSection
            items={combinedActivitiesList}
            isExpanded={checkIsSectionExpanded(SECTION_NAMES.activities)}
            onToggle={() => onToggleSection(SECTION_NAMES.activities)}
            manualActivityIds={manualActivityIdsList}
            onRemoveActivity={handleActivityRemove}
            onEditActivity={handleActivityEdit}
          />

          {/* Add Activity Button */}
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="w-full py-2 px-3 md:px-4 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-xl text-sm md:text-base text-zinc-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} className="md:w-[18px] md:h-[18px]" />
            Add Activity
          </button>
        </div>
      )}

      {/* Add/Edit Activity Modal */}
      <AddActivityModal
        isOpen={isActivityModalOpen}
        onClose={handleModalClose}
        onAdd={handleActivityAdd}
        onUpdate={handleActivityUpdate}
        date={day.dateKey}
        editingActivity={activityBeingEdited}
      />
    </div>
  );
});
