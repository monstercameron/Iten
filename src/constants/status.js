/**
 * @fileoverview Status constants and configuration for booking/planning states
 * @module constants/status
 */

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  MountainSnow,
} from "lucide-react";

/**
 * @typedef {Object} StatusConfiguration
 * @property {string} label - Human-readable status label
 * @property {React.ComponentType} icon - Lucide icon component
 * @property {string} cls - Tailwind CSS classes for styling
 */

/**
 * Status configuration map for booking/planning states.
 * Maps status codes to their display configuration.
 * 
 * @constant {Object.<string, StatusConfiguration>}
 * 
 * @property {StatusConfiguration} BOOKED - Confirmed booking status (green)
 * @property {StatusConfiguration} PLANNED - Planned but not booked (blue)
 * @property {StatusConfiguration} PLANNED_WARN - Planned with warning (amber)
 * @property {StatusConfiguration} BUFFER - Buffer/flexible time (violet)
 * @property {StatusConfiguration} TO_BOOK - Needs to be booked (rose/red)
 * @property {StatusConfiguration} WEEKEND_SKI - Weekend ski trip (teal)
 * @property {StatusConfiguration} OPTIONAL - Optional activity (zinc)
 * @property {StatusConfiguration} IF_CONDITIONAL - Conditional on other factors (fuchsia)
 * @property {StatusConfiguration} UNSET - No status set (zinc)
 */
export const STATUS = {
  /** Confirmed booking - displays with emerald/green styling */
  BOOKED: {
    label: "Booked",
    icon: CheckCircle2,
    cls: "bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-800/60",
  },
  
  /** Planned activity - displays with sky blue styling */
  PLANNED: {
    label: "Planned",
    icon: CheckCircle2,
    cls: "bg-sky-950/60 text-sky-200 ring-1 ring-sky-800/60",
  },
  
  /** Planned with warning - displays with amber styling */
  PLANNED_WARN: {
    label: "Planned (check)",
    icon: AlertTriangle,
    cls: "bg-amber-950/60 text-amber-200 ring-1 ring-amber-800/60",
  },
  
  /** Buffer/flexible time - displays with violet styling */
  BUFFER: {
    label: "Buffer",
    icon: AlertTriangle,
    cls: "bg-violet-950/60 text-violet-200 ring-1 ring-violet-800/60",
  },
  
  /** Needs booking - displays with rose/red styling */
  TO_BOOK: {
    label: "To book",
    icon: XCircle,
    cls: "bg-rose-950/60 text-rose-200 ring-1 ring-rose-800/60",
  },
  
  /** Weekend ski trip - displays with teal styling */
  WEEKEND_SKI: {
    label: "Weekend ski",
    icon: MountainSnow,
    cls: "bg-teal-950/60 text-teal-200 ring-1 ring-teal-800/60",
  },
  
  /** Optional activity - displays with neutral zinc styling */
  OPTIONAL: {
    label: "Optional",
    icon: AlertTriangle,
    cls: "bg-zinc-900/60 text-zinc-200 ring-1 ring-zinc-700/60",
  },
  
  /** Conditional on other factors - displays with fuchsia styling */
  IF_CONDITIONAL: {
    label: "Conditional",
    icon: Filter,
    cls: "bg-fuchsia-950/60 text-fuchsia-200 ring-1 ring-fuchsia-800/60",
  },
  
  /** Default/unset status - displays with neutral zinc styling */
  UNSET: {
    label: "Unspecified",
    icon: Clock,
    cls: "bg-zinc-900/60 text-zinc-300 ring-1 ring-zinc-700/60",
  },
};
