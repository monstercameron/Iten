/**
 * @fileoverview Status indicator pill component
 * @module components/StatusPill
 */

import { STATUS } from "../constants/status";
import { classNames } from "../utils/classNames";

/**
 * Retrieves the status configuration for a given status code.
 * Falls back to UNSET status if code is not found.
 * 
 * @pure
 * @param {string} statusCode - The status code to look up
 * @returns {Object} Status configuration with label, icon, and cls
 */
function getStatusConfiguration(statusCode) {
  return STATUS[statusCode] || STATUS.UNSET;
}

/**
 * StatusPill Component
 * 
 * Displays a small colored pill badge indicating the booking/planning status
 * of an itinerary item. Includes an icon and label.
 * 
 * @param {Object} props - Component props
 * @param {string} props.code - Status code (BOOKED, PLANNED, TO_BOOK, etc.)
 * @returns {JSX.Element} Rendered status pill
 * 
 * @example
 * <StatusPill code="BOOKED" />
 * <StatusPill code="TO_BOOK" />
 */
export function StatusPill({ code: statusCode }) {
  const statusConfiguration = getStatusConfiguration(statusCode);
  const StatusIconComponent = statusConfiguration.icon;
  
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        statusConfiguration.cls
      )}
      title={statusConfiguration.label}
    >
      <StatusIconComponent className="h-3.5 w-3.5" />
      {statusConfiguration.label}
    </span>
  );
}
