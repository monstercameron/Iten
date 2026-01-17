/**
 * @fileoverview Shelter/accommodation section component displaying lodging
 * information with check-in/check-out times and embedded map preview.
 * 
 * @description Features include:
 * - Accommodation name, address, and type display
 * - Check-in/check-out time badges
 * - Multi-day stay tracking (night X of Y)
 * - Copy address to clipboard functionality
 * - Embedded map preview for desktop view
 * - Shelter notes display
 */

import { useState, memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Building2, MapPin, Home, Clock, Calendar, StickyNote, Copy, Check } from "lucide-react";
import { classNames } from "../../utils/classNames";
import { MapPreview } from "../MapPreview";

/* ============================================================================
   CONSTANTS
   ============================================================================ */

/**
 * Timeout duration for copy feedback in milliseconds
 * @constant {number}
 */
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/* ============================================================================
   TYPE DEFINITIONS
   ============================================================================ */

/**
 * @typedef {Object} ShelterData
 * @property {string} [name] - Accommodation name
 * @property {string} [address] - Street address
 * @property {string} [type] - Type of accommodation (Hotel, Airbnb, etc.)
 * @property {string} [checkIn] - Check-in time
 * @property {string} [checkOut] - Check-out time
 * @property {number} [dayOfStay] - Current day number in multi-day stay
 * @property {number} [totalStayDays] - Total days in multi-day stay
 * @property {boolean} [isMultiDayStay] - Whether this is a multi-day stay
 * @property {string} [notes] - Additional notes
 * @property {{lat: number, lng: number}} [coordinates] - GPS coordinates
 */

/* ============================================================================
   PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Determines if shelter data is empty or missing
 * @pure
 * @param {ShelterData|null|undefined} shelter - Shelter data to check
 * @returns {boolean} True if shelter data is empty
 */
const isShelterDataEmpty = (shelter) => {
  return !shelter || Object.keys(shelter).length === 0;
};

/**
 * Determines if check-out time should be displayed based on stay progress
 * @pure
 * @param {ShelterData} shelter - Shelter data
 * @returns {boolean} True if on last day of stay
 */
const shouldShowCheckOutTime = (shelter) => {
  return shelter.checkOut && shelter.dayOfStay === shelter.totalStayDays;
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * Expandable section displaying shelter/accommodation information
 * 
 * @component
 * @param {Object} props
 * @param {ShelterData} props.shelter - Shelter/accommodation data
 * @param {boolean} props.isExpanded - Whether the section is expanded
 * @param {Function} props.onToggle - Callback to toggle section expansion
 * @returns {JSX.Element|null} Shelter section or null if no data
 */
export const ShelterSection = memo(function ShelterSection({ shelter, isExpanded, onToggle }) {
  const [hasAddressBeenCopied, setHasAddressBeenCopied] = useState(false);

  // Early return if no shelter data to display
  if (isShelterDataEmpty(shelter)) return null;

  /**
   * Handles copying shelter address to clipboard
   * @param {Event} event - Click event
   */
  const handleCopyAddressToClipboard = useCallback(async (event) => {
    event.stopPropagation();
    if (!shelter.address) return;

    const [, copyErr] = await navigator.clipboard.writeText(shelter.address).then(
      () => [undefined, null],
      (error) => [null, error instanceof Error ? error : new Error(String(error))]
    );
    
    if (copyErr) {
      console.error('Failed to copy address:', copyErr);
      return;
    }
    
    setHasAddressBeenCopied(true);
    setTimeout(() => setHasAddressBeenCopied(false), COPY_FEEDBACK_TIMEOUT_MS);
  }, [shelter.address]);

  const displayCheckOutTime = shouldShowCheckOutTime(shelter);
  const hasMapCoordinates = Boolean(shelter.coordinates);
  const hasMultiDayStayInfo = shelter.isMultiDayStay && shelter.dayOfStay && shelter.totalStayDays;

  return (
    <div className="border border-purple-900/50 rounded-lg overflow-hidden bg-purple-950/20">
      {/* Section Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 md:px-4 py-2.5 md:py-3 hover:bg-purple-900/20 transition flex items-center justify-between bg-purple-900/30"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
          <span className="text-sm md:text-base font-medium text-purple-200">
            🏨 Shelter
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
        ) : (
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
        )}
      </button>

      {/* Expandable Content Section */}
      {isExpanded && (
        <div className="p-3 md:p-4 bg-purple-950/10 slide-down">
          {/* Two Column Layout: Details (60%) + Map (40%) - stacked on mobile */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* LEFT COLUMN - Shelter Details */}
            <div className="w-full md:w-[60%] min-w-0 flex flex-col gap-3 md:gap-4">
              {/* Shelter Name & Address */}
              <div>
                {shelter.name && (
                  <div className="mb-2 md:mb-3">
                    <div className="text-base md:text-lg font-semibold text-purple-100">
                      {shelter.name}
                    </div>
                    {shelter.address && (
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-purple-300 mt-1">
                        <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400" />
                        <span className="truncate">{shelter.address}</span>
                        <button
                          onClick={handleCopyAddressToClipboard}
                          className={classNames(
                            "p-1 rounded transition-colors flex-shrink-0",
                            hasAddressBeenCopied
                              ? "text-emerald-400"
                              : "text-purple-400 hover:text-purple-200 hover:bg-purple-800/50"
                          )}
                          title={hasAddressBeenCopied ? "Copied!" : "Copy address"}
                        >
                          {hasAddressBeenCopied ? <Check className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <Copy className="h-3 w-3 md:h-3.5 md:w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Tags Row */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {/* Accommodation Type */}
                {shelter.type && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-purple-900/40 border border-purple-700/50 text-xs md:text-sm text-purple-200">
                    <Home className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400" />
                    <span>{shelter.type}</span>
                  </div>
                )}
                {/* Check-in Time */}
                {shelter.checkIn && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-xs md:text-sm text-emerald-200">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-400" />
                    <span>Check-in: {shelter.checkIn}</span>
                  </div>
                )}
                {/* Check-out Time (only on last day) */}
                {displayCheckOutTime && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-xs md:text-sm text-amber-200">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
                    <span>Check-out: {shelter.checkOut}</span>
                  </div>
                )}
                {/* Multi-Day Stay Progress */}
                {hasMultiDayStayInfo && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-indigo-900/40 border border-indigo-700/50 text-xs md:text-sm text-indigo-200">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-400" />
                    <span>Night {shelter.dayOfStay} of {shelter.totalStayDays}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - Map Preview (desktop only) */}
            {hasMapCoordinates && (
              <div className="hidden md:block w-[40%] flex-shrink-0 h-[140px]">
                <MapPreview
                  coordinates={shelter.coordinates}
                  name={shelter.name}
                  address={shelter.address}
                  type={shelter.type}
                />
              </div>
            )}
          </div>

          {/* Notes Section */}
          {shelter.notes && (
            <div className="flex items-start gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-purple-900/30 text-xs md:text-sm text-purple-300">
              <StickyNote className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span className="italic">{shelter.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
