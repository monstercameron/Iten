/**
 * @fileoverview Day Metadata component - displays summary badges for a day.
 * 
 * Shows contextual badges indicating:
 * - Travel day status
 * - Locations visited
 * - Estimated cost with currencies
 * - Number of unbooked items
 * 
 * @module components/DayMetadata
 */

import { Plane, MapPin, DollarSign, AlertCircle } from "lucide-react";
import { classNames } from "../utils/classNames";

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Formats an estimated cost with locale-specific number formatting.
 * @pure
 * @param {number} costAmount - The cost amount to format
 * @returns {string} Formatted cost string
 */
function formatEstimatedCost(costAmount) {
  return costAmount.toLocaleString();
}

/**
 * Formats currency codes as a display string.
 * @pure
 * @param {Array<string>} currencyCodes - Array of currency codes
 * @returns {string} Currency codes joined with "/"
 */
function formatCurrencyDisplay(currencyCodes) {
  return currencyCodes.join("/");
}

/**
 * Checks if there are valid cost details to display.
 * @pure
 * @param {number} costAmount - The estimated cost
 * @param {Array<string>} currencyCodes - The currency codes
 * @returns {boolean} True if cost should be displayed
 */
function hasValidCostToDisplay(costAmount, currencyCodes) {
  return costAmount > 0 && currencyCodes && currencyCodes.length > 0;
}

/**
 * Checks if there are valid location flags to display.
 * @pure
 * @param {Array<string>} locationFlags - The location flag strings
 * @returns {boolean} True if location flags should be displayed
 */
function hasValidLocationFlags(locationFlags) {
  return locationFlags && locationFlags.length > 0;
}

/**
 * Checks if there are unbooked items to warn about.
 * @pure
 * @param {boolean} hasUnbookedItems - Whether there are unbooked items
 * @param {number} unbookedItemCount - Count of unbooked items
 * @returns {boolean} True if unbooked warning should be displayed
 */
function shouldShowUnbookedWarning(hasUnbookedItems, unbookedItemCount) {
  return hasUnbookedItems && unbookedItemCount > 0;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * @typedef {Object} DayMetadataInfo
 * @property {boolean} hasTravel - Whether this is a travel day
 * @property {Array<string>} locationFlags - List of location names/flags
 * @property {number} estimatedCost - Total estimated cost for the day
 * @property {Array<string>} costCurrencies - List of currencies used
 * @property {number} unbootedCount - Number of unbooked items
 * @property {boolean} hasUnbooked - Whether there are unbooked items
 */

/**
 * @typedef {Object} DayMetadataProps
 * @property {Object} day - The day object containing metadata
 * @property {DayMetadataInfo} day.metadata - Metadata information for the day
 */

/**
 * Day Metadata component - displays summary badges for a day's itinerary.
 * 
 * Renders a row of colorful badges showing key information:
 * - Blue badge for travel days
 * - Purple badge(s) for locations
 * - Amber badge for estimated costs
 * - Red badge for unbooked items (warning)
 * 
 * @param {DayMetadataProps} props - Component properties
 * @returns {JSX.Element|null} The metadata badges or null if no metadata
 */
export function DayMetadata({ day }) {
  // CRITICAL PATH: Early return if no metadata available
  if (!day.metadata) return null;

  // Destructure metadata for cleaner access
  const { 
    hasTravel: isTravelDay, 
    locationFlags: locationFlagsList, 
    estimatedCost: totalEstimatedCost, 
    costCurrencies: currencyCodesList, 
    unbootedCount: unbookedItemCount, 
    hasUnbooked: hasUnbookedItems 
  } = day.metadata;

  return (
    <div className="flex items-center gap-4 flex-wrap mt-2">
      {/* Travel Day Indicator Badge */}
      {isTravelDay && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-800/50 border border-blue-600/60">
          <Plane className="h-5 w-5 text-blue-300" />
          <span className="text-base font-medium text-blue-200">Travel Day</span>
        </div>
      )}

      {/* Location Flags Badges */}
      {hasValidLocationFlags(locationFlagsList) && (
        <div className="flex items-center gap-3">
          {locationFlagsList.map((locationFlag, flagIndex) => (
            <div
              key={flagIndex}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-purple-800/40 border border-purple-600/50"
            >
              <MapPin className="h-5 w-5 text-purple-300" />
              <span className="text-base font-medium text-purple-200">{locationFlag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Estimated Cost Badge */}
      {hasValidCostToDisplay(totalEstimatedCost, currencyCodesList) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-800/50 border border-amber-600/60">
          <DollarSign className="h-5 w-5 text-amber-300" />
          <span className="text-base font-medium text-amber-200">
            {formatEstimatedCost(totalEstimatedCost)}
            <span className="ml-1 text-amber-300">
              {formatCurrencyDisplay(currencyCodesList)}
            </span>
          </span>
        </div>
      )}

      {/* Unbooked Items Warning Badge */}
      {shouldShowUnbookedWarning(hasUnbookedItems, unbookedItemCount) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-800/50 border border-red-600/60">
          <AlertCircle className="h-5 w-5 text-red-300" />
          <span className="text-base font-medium text-red-200">
            {unbookedItemCount} to book
          </span>
        </div>
      )}
    </div>
  );
}
