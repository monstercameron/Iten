/**
 * @fileoverview Travel section component displaying flight/transport segments
 * with route maps, buffer time cards, and backup plan accordions.
 * 
 * @description Features include:
 * - Flight/transport segment cards with route visualization
 * - Special styling for buffer time segments
 * - Embedded route maps for flights
 * - Collapsible backup plan accordion
 * - Flight details (airline, aircraft, cabin class, duration)
 */

import React, { useState, memo } from "react";
import { ChevronDown, ChevronRight, Plane, Clock, Timer, MapPin, Armchair, Coffee, Hourglass, ShieldCheck } from "lucide-react";
import { StatusPill } from "../StatusPill";
import { TravelRouteMap } from "../TravelRouteMap";
import { classNames } from "../../utils/classNames";

/* ============================================================================
   TYPE DEFINITIONS
   ============================================================================ */

/**
 * @typedef {Object} TravelSegment
 * @property {string} id - Unique segment identifier
 * @property {string} route - Route description (e.g., "SFO → NRT")
 * @property {string} [status] - Segment status code
 * @property {string} [time] - Departure/arrival time
 * @property {string} [duration] - Travel duration
 * @property {string} [type] - Travel type (Flight, Train, etc.)
 * @property {string} [airline] - Airline name
 * @property {string} [flight] - Flight number
 * @property {string} [aircraft] - Aircraft type
 * @property {string} [cabinClass] - Cabin class
 * @property {string} [departureAirport] - Departure airport with code
 * @property {string} [arrivalAirport] - Arrival airport with code
 * @property {string} [location] - Location (for buffer segments)
 * @property {string} [details] - Additional details
 * @property {Object} [backupPlan] - Backup plan information
 */

/**
 * @typedef {Object} BackupPlan
 * @property {string} trigger - Condition that triggers backup plan
 * @property {Array<BackupOption>} options - Array of backup options
 */

/**
 * @typedef {Object} BackupOption
 * @property {string} id - Option identifier
 * @property {number} priority - Priority level (1 = highest)
 * @property {string} title - Option title
 * @property {string} description - Option description
 * @property {string} [contact] - Contact information
 * @property {string} status - Option status
 */

/* ============================================================================
   PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Determines if a travel item is a buffer segment
 * @pure
 * @param {TravelSegment} travelItem - Travel segment to check
 * @returns {boolean} True if item is a buffer segment
 */
const isBufferTimeSegment = (travelItem) => travelItem.status === 'BUFFER';

/**
 * Determines if a travel segment has route map data
 * @pure
 * @param {TravelSegment} travelItem - Travel segment to check
 * @returns {boolean} True if has both departure and arrival airports
 */
const hasRouteMapData = (travelItem) => {
  return Boolean(travelItem.departureAirport && travelItem.arrivalAirport);
};

/**
 * Gets priority-based styling classes for backup options
 * @pure
 * @param {number} priority - Priority level (1, 2, or 3)
 * @returns {string} Tailwind CSS classes
 */
const getBackupOptionPriorityClasses = (priority) => {
  switch (priority) {
    case 1: return "bg-green-950/40 border border-green-900/50";
    case 2: return "bg-amber-950/40 border border-amber-900/50";
    case 3: return "bg-red-950/40 border border-red-900/50";
    default: return "bg-zinc-950/40 border border-zinc-900/50";
  }
};

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

/**
 * Special card component for buffer time segments with attractive gradient styling
 * 
 * @component
 * @param {Object} props
 * @param {TravelSegment} props.bufferSegmentItem - Buffer segment data
 * @returns {JSX.Element} Styled buffer time card
 */
function BufferSegmentCard({ bufferSegmentItem }) {
  const hasBufferLocation = Boolean(bufferSegmentItem.location);
  const hasBufferType = bufferSegmentItem.type && bufferSegmentItem.type !== 'Buffer';
  const bufferDescription = bufferSegmentItem.details || bufferSegmentItem.route || 'Scheduled buffer period';

  return (
    <div className="p-3 md:p-4">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-950/40 via-purple-950/30 to-indigo-950/40 border border-violet-700/40 p-4 md:p-5">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500 rounded-full blur-3xl" />
        </div>
        
        <div className="relative flex items-center gap-3 md:gap-5">
          {/* Icon Container */}
          <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/40 flex items-center justify-center">
            <Hourglass className="w-6 h-6 md:w-8 md:h-8 text-violet-300" />
          </div>
          
          {/* Buffer Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
              <h3 className="text-base md:text-lg font-semibold text-violet-100">
                ⏳ Buffer Time
              </h3>
              <StatusPill code={bufferSegmentItem.status} />
            </div>
            
            <p className="text-violet-200/80 text-xs md:text-sm mb-2 md:mb-3 truncate">
              {bufferDescription}
            </p>
            
            {/* Buffer Tags Row */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {bufferSegmentItem.time && (
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-violet-800/40 border border-violet-600/50 text-xs md:text-sm text-violet-200">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
                  <span>{bufferSegmentItem.time}</span>
                </div>
              )}
              {hasBufferLocation && (
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-violet-800/40 border border-violet-600/50 text-xs md:text-sm text-violet-200">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
                  <span>{bufferSegmentItem.location}</span>
                </div>
              )}
              {hasBufferType && (
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-indigo-800/40 border border-indigo-600/50 text-xs md:text-sm text-indigo-200">
                  <Coffee className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-400" />
                  <span>{bufferSegmentItem.type}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Safety Indicator Badge (desktop only) */}
          <div className="hidden sm:flex flex-col items-center gap-2 text-violet-400/60">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-medium uppercase tracking-wider">Safe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible accordion component for displaying backup plan options
 * 
 * @component
 * @param {Object} props
 * @param {BackupPlan} props.backupPlanData - Backup plan information
 * @returns {JSX.Element} Expandable backup plan section
 */
function BackupPlanAccordion({ backupPlanData }) {
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);

  const toggleAccordionExpansion = () => setIsAccordionExpanded(!isAccordionExpanded);

  return (
    <div className="mt-3 pt-3 border-t border-blue-900/20">
      {/* Accordion Toggle Button */}
      <button
        onClick={toggleAccordionExpansion}
        className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300"
      >
        {isAccordionExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        🚨 Backup Plan: {backupPlanData.trigger}
      </button>

      {/* Expandable Options List */}
      {isAccordionExpanded && (
        <div className="mt-2 space-y-2 pl-5">
          {backupPlanData.options.map((backupOption) => (
            <div
              key={backupOption.id}
              className={classNames(
                "text-xs rounded p-2",
                getBackupOptionPriorityClasses(backupOption.priority)
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="font-medium text-zinc-100">
                    P{backupOption.priority}: {backupOption.title}
                  </div>
                  <div className="text-zinc-400 mt-0.5">
                    {backupOption.description}
                  </div>
                  {backupOption.contact && (
                    <div className="text-zinc-500 mt-0.5 italic">
                      Contact: {backupOption.contact}
                    </div>
                  )}
                </div>
                <StatusPill code={backupOption.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * Expandable section displaying travel/transport segments with route maps
 * 
 * @component
 * @param {Object} props
 * @param {Array<TravelSegment>} props.items - Array of travel segment items
 * @param {boolean} props.isExpanded - Whether the section is expanded
 * @param {Function} props.onToggle - Callback to toggle section expansion
 * @param {boolean} [props.showBackupPlans] - Whether to show backup plan accordions
 * @returns {JSX.Element|null} Travel section or null if no items
 */
export const TravelSection = memo(function TravelSection({ items, isExpanded, onToggle, showBackupPlans }) {
  // Early return if no travel items to display
  if (!items || items.length === 0) return null;

  const travelSegmentCount = items.length;

  return (
    <div className="border border-blue-900/50 rounded-lg overflow-hidden bg-blue-950/20">
      {/* Section Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 md:px-4 py-2.5 md:py-3 hover:bg-blue-900/20 transition flex items-center justify-between bg-blue-900/30"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Plane className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
          <span className="text-sm md:text-base font-medium text-blue-200">
            ✈️ Travel <span className="text-blue-500">({travelSegmentCount})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
        ) : (
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
        )}
      </button>

      {/* Expandable Travel Segments List */}
      {isExpanded && (
        <div className="divide-y divide-blue-900/30 bg-blue-950/10 slide-down mb-3">
          {items.map((travelItem) => (
            // Render buffer segments with special styling
            isBufferTimeSegment(travelItem) ? (
              <BufferSegmentCard key={travelItem.id} bufferSegmentItem={travelItem} />
            ) : (
            <div key={travelItem.id} className="p-3 md:p-4">
              {/* Two Column Layout: Details (60%) + Map (40%) - stacked on mobile */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:min-h-[180px]">
                {/* LEFT COLUMN - Travel Details */}
                <div className="w-full md:w-[60%] min-w-0 flex flex-col justify-between">
                  {/* Route & Status Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 md:gap-3 mb-2 md:mb-3">
                      <div>
                        <div className="font-semibold text-blue-100 text-base md:text-lg">
                          {travelItem.route}
                        </div>
                        {travelItem.flight && (
                          <div className="text-xs md:text-sm text-blue-400 mt-1">
                            {travelItem.airline} {travelItem.flight}
                            {travelItem.aircraft && <span className="text-blue-500"> • {travelItem.aircraft}</span>}
                          </div>
                        )}
                      </div>
                      {travelItem.status && <StatusPill code={travelItem.status} />}
                    </div>
                  </div>

                  {/* Flight Details Tags Row */}
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-blue-300">
                    {travelItem.time && (
                      <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50">
                        <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                        <span>{travelItem.time}</span>
                      </div>
                    )}
                    {travelItem.duration && (
                      <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50">
                        <Timer className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                        <span>{travelItem.duration}</span>
                      </div>
                    )}
                    {travelItem.cabinClass && (
                      <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50">
                        <Armchair className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                        <span>{travelItem.cabinClass}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN - Route Map (desktop only) */}
                {hasRouteMapData(travelItem) && (
                  <div className="hidden md:block w-[40%] flex-shrink-0">
                    <TravelRouteMap
                      departureAirport={travelItem.departureAirport}
                      arrivalAirport={travelItem.arrivalAirport}
                      route={travelItem.route}
                      type={travelItem.type}
                    />
                  </div>
                )}
              </div>

              {/* Airport Details Row */}
              {(travelItem.departureAirport || travelItem.arrivalAirport) && (
                <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-blue-900/30">
                  {travelItem.departureAirport && (
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-blue-300">
                      <Plane className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400 rotate-[-45deg]" />
                      <span className="text-blue-400 font-medium">From:</span>
                      <span className="truncate">{travelItem.departureAirport}</span>
                    </div>
                  )}
                  {travelItem.arrivalAirport && (
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-blue-300">
                      <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                      <span className="text-blue-400 font-medium">To:</span>
                      <span className="truncate">{travelItem.arrivalAirport}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Backup Plan Accordion */}
              {showBackupPlans && travelItem.backupPlan && (
                <BackupPlanAccordion backupPlanData={travelItem.backupPlan} />
              )}
            </div>
            )
          ))}
        </div>
      )}
    </div>
  );
});
