import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  MountainSnow,
} from "lucide-react";

export const STATUS = {
  BOOKED: {
    label: "Booked",
    icon: CheckCircle2,
    cls: "bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-800/60",
  },
  PLANNED: {
    label: "Planned",
    icon: CheckCircle2,
    cls: "bg-sky-950/60 text-sky-200 ring-1 ring-sky-800/60",
  },
  PLANNED_WARN: {
    label: "Planned (check)",
    icon: AlertTriangle,
    cls: "bg-amber-950/60 text-amber-200 ring-1 ring-amber-800/60",
  },
  BUFFER: {
    label: "Buffer",
    icon: AlertTriangle,
    cls: "bg-violet-950/60 text-violet-200 ring-1 ring-violet-800/60",
  },
  TO_BOOK: {
    label: "To book",
    icon: XCircle,
    cls: "bg-rose-950/60 text-rose-200 ring-1 ring-rose-800/60",
  },
  WEEKEND_SKI: {
    label: "Weekend ski",
    icon: MountainSnow,
    cls: "bg-teal-950/60 text-teal-200 ring-1 ring-teal-800/60",
  },
  OPTIONAL: {
    label: "Optional",
    icon: AlertTriangle,
    cls: "bg-zinc-900/60 text-zinc-200 ring-1 ring-zinc-700/60",
  },
  IF_CONDITIONAL: {
    label: "Conditional",
    icon: Filter,
    cls: "bg-fuchsia-950/60 text-fuchsia-200 ring-1 ring-fuchsia-800/60",
  },
  UNSET: {
    label: "Unspecified",
    icon: Clock,
    cls: "bg-zinc-900/60 text-zinc-300 ring-1 ring-zinc-700/60",
  },
};
