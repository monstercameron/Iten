import React, { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Plane,
  Train,
  Bus,
  Bed,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Route,
  Utensils,
  Backpack,
  MountainSnow,
  Building2,
} from "lucide-react";

// Dark-mode itinerary page (single-file React component)
// Tailwind assumed. No external deps beyond lucide-react.

const ITINERARY = [
  {
    date: "Fri Jan 30, 2026",
    time: "6:10 PM → 9:43 PM",
    tz: "ET→PT",
    route: "FLL → SFO",
    segment: "Flight",
    details: "UA249 (United Economy S)",
    night: "—",
    fixed: "BOOKED",
  },
  {
    date: "Fri Jan 30 → Sun Feb 1, 2026",
    time: "11:45 PM → 6:50 AM",
    tz: "PT→PHT",
    route: "SFO → MNL",
    segment: "Flight",
    details: "UA189 (United Economy S)",
    night: "—",
    fixed: "BOOKED",
  },
  {
    date: "Sun Feb 1, 2026",
    time: "~6:50 AM → ~12:30 PM",
    tz: "PHT",
    route: "MNL (arrival)",
    segment: "Airport",
    details: "Immigration / bags / buffer",
    night: "—",
    fixed: "BUFFER",
  },
  {
    date: "Sun Feb 1, 2026",
    time: "TBD",
    tz: "PHT",
    route: "MNL → BCD",
    segment: "Flight",
    details: "Domestic positioning flight",
    night: "BCD (home)",
    fixed: "TO_BOOK",
  },
  {
    date: "Sun Feb 1–Thu Feb 5",
    time: "All day",
    tz: "PHT",
    route: "Bacolod (BCD)",
    segment: "Stay",
    details: "Stay at home (BCD) / prep",
    night: "BCD (home)",
    fixed: "PLANNED",
  },
  {
    date: "Fri Feb 6 (Japan trip start, 2 people)",
    time: "TBD",
    tz: "PHT",
    route: "BCD → (MNL or CEB)",
    segment: "Flight",
    details: "Positioning leg",
    night: "—",
    fixed: "TO_BOOK",
  },
  {
    date: "Fri Feb 6",
    time: "2–4 hrs (buffer)",
    tz: "PHT",
    route: "(MNL or CEB)",
    segment: "Layover",
    details: "Connection buffer",
    night: "—",
    fixed: "TO_BOOK",
  },
  {
    date: "Fri Feb 6",
    time: "TBD",
    tz: "PHT→JST",
    route: "(MNL or CEB) → NRT",
    segment: "Flight",
    details: "International leg to Japan",
    night: "—",
    fixed: "TO_BOOK",
  },
  {
    date: "Fri Feb 6",
    time: "TBD (evening)",
    tz: "JST",
    route: "NRT → Tokyo",
    segment: "Transit",
    details: "Airport → Tokyo (train/bus)",
    night: "Tokyo (Night #1)",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Fri Feb 6",
    time: "3:00 PM",
    tz: "JST",
    route: "Tokyo Airbnb",
    segment: "Check-in",
    details: "Airbnb check-in — 2-chōme-7-12 Taitō, Taito City, Tokyo 110-0016",
    night: "Tokyo (Night #1)",
    fixed: "BOOKED",
  },
  {
    date: "Sat Feb 7",
    time: "6:30–7:30 AM",
    tz: "JST",
    route: "Tokyo",
    segment: "Meal",
    details: "Breakfast",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Sat Feb 7",
    time: "7:30–11:30 AM",
    tz: "JST",
    route: "Tokyo → Joetsu",
    segment: "Travel",
    details: "Train (Shinkansen + transfers)",
    night: "—",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Sat Feb 7",
    time: "11:30 AM–12:30 PM",
    tz: "JST",
    route: "Joetsu",
    segment: "Check-in",
    details: "Drop bags / check-in",
    night: "—",
    fixed: "TO_BOOK",
  },
  {
    date: "Sat Feb 7",
    time: "12:30–1:30 PM",
    tz: "JST",
    route: "Joetsu",
    segment: "Meal",
    details: "Lunch",
    night: "—",
    fixed: "UNSET",
  },
  {
    date: "Sat Feb 7",
    time: "1:30–2:30 PM",
    tz: "JST",
    route: "Joetsu → Myoko",
    segment: "Bus",
    details: "Commute (~1 hr)",
    night: "—",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Sat Feb 7",
    time: "2:30–5:00 PM",
    tz: "JST",
    route: "Myoko",
    segment: "Ski setup",
    details: "Rentals + warm-up (if lifts open)",
    night: "—",
    fixed: "OPTIONAL",
  },
  {
    date: "Sat Feb 7",
    time: "5:00–6:00 PM",
    tz: "JST",
    route: "Myoko → Joetsu",
    segment: "Bus",
    details: "Return commute",
    night: "—",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Sat Feb 7",
    time: "Evening",
    tz: "JST",
    route: "Joetsu",
    segment: "Meal/Rest",
    details: "Dinner + onsen/chill",
    night: "Joetsu (Night 1 of X)",
    fixed: "PLANNED",
  },
  {
    date: "Sun Feb 8",
    time: "6:30–7:30 AM",
    tz: "JST",
    route: "Joetsu",
    segment: "Meal",
    details: "Breakfast",
    night: "Joetsu",
    fixed: "UNSET",
  },
  {
    date: "Sun Feb 8",
    time: "7:30–8:30 AM",
    tz: "JST",
    route: "Joetsu → Myoko",
    segment: "Bus",
    details: "Commute (~1 hr)",
    night: "—",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Sun Feb 8",
    time: "9:00 AM–12:00 PM",
    tz: "JST",
    route: "Myoko",
    segment: "Ski",
    details: "Ski block 1",
    night: "—",
    fixed: "WEEKEND_SKI",
  },
  {
    date: "Sun Feb 8",
    time: "12:00–1:00 PM",
    tz: "JST",
    route: "Myoko",
    segment: "Meal",
    details: "Lunch",
    night: "—",
    fixed: "UNSET",
  },
  {
    date: "Sun Feb 8",
    time: "1:00–3:30 PM",
    tz: "JST",
    route: "Myoko",
    segment: "Ski",
    details: "Ski block 2",
    night: "—",
    fixed: "WEEKEND_SKI",
  },
  {
    date: "Sun Feb 8",
    time: "3:30–4:30 PM",
    tz: "JST",
    route: "Myoko → Joetsu",
    segment: "Bus",
    details: "Return commute",
    night: "—",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Sun Feb 8",
    time: "Evening",
    tz: "JST",
    route: "Joetsu",
    segment: "Meal/Pack",
    details: "Dinner + pack",
    night: "Joetsu (Night 2 of X)",
    fixed: "PLANNED",
  },
  {
    date: "Mon Feb 9",
    time: "—",
    tz: "JST",
    route: "Joetsu",
    segment: "Stay",
    details: "If X ≥ 3: stay another night in Joetsu (rest day or optional day-trip)",
    night: "Joetsu (Night 3 of X)",
    fixed: "IF_CONDITIONAL",
  },
  {
    date: "Mon Feb 9 (if X=2)",
    time: "8:00–9:00 AM",
    tz: "JST",
    route: "Joetsu",
    segment: "Meal/Checkout",
    details: "Breakfast + checkout",
    night: "—",
    fixed: "PLANNED",
  },
  {
    date: "Mon Feb 9 (if X=2)",
    time: "9:00 AM–12:00 PM",
    tz: "JST",
    route: "Joetsu → Tokyo",
    segment: "Travel",
    details: "Train return",
    night: "—",
    fixed: "PLANNED",
  },
  {
    date: "Mon Feb 9 (if X=2)",
    time: "12:00–1:00 PM",
    tz: "JST",
    route: "Tokyo",
    segment: "Check-in",
    details: "Drop bags / hotel",
    night: "Tokyo",
    fixed: "TO_BOOK",
  },
  {
    date: "Mon Feb 9 (if X=2)",
    time: "1:00–6:00 PM",
    tz: "JST",
    route: "Tokyo",
    segment: "Explore",
    details: "Explore block",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Mon Feb 9 (if X=2)",
    time: "7:00–9:00 PM",
    tz: "JST",
    route: "Tokyo",
    segment: "Meal",
    details: "Dinner",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Tue Feb 10",
    time: "9:00–10:00 AM",
    tz: "JST",
    route: "Tokyo",
    segment: "Meal",
    details: "Breakfast",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Tue Feb 10",
    time: "10:00 AM–1:00 PM",
    tz: "JST",
    route: "Tokyo",
    segment: "Explore",
    details: "Explore block",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Tue Feb 10",
    time: "1:00–2:00 PM",
    tz: "JST",
    route: "Tokyo",
    segment: "Meal",
    details: "Lunch",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Tue Feb 10",
    time: "2:00–6:00 PM",
    tz: "JST",
    route: "Tokyo",
    segment: "Explore",
    details: "Explore block",
    night: "Tokyo",
    fixed: "UNSET",
  },
  {
    date: "Tue Feb 10",
    time: "Evening",
    tz: "JST",
    route: "Tokyo",
    segment: "Meal/Rest",
    details: "Final Tokyo dinner",
    night: "Tokyo (LAST NIGHT)",
    fixed: "PLANNED",
  },
  {
    date: "Wed Feb 11 (Japan trip end)",
    time: "Morning",
    tz: "JST",
    route: "Tokyo",
    segment: "Prep",
    details: "Pack / last shopping",
    night: "—",
    fixed: "PLANNED",
  },
  {
    date: "Wed Feb 11",
    time: "Midday",
    tz: "JST",
    route: "Tokyo → NRT",
    segment: "Transit",
    details: "Airport transfer (arrive ~3 hrs early)",
    night: "—",
    fixed: "PLANNED_WARN",
  },
  {
    date: "Wed Feb 11",
    time: "TBD",
    tz: "JST→PHT",
    route: "NRT → (MNL or CEB)",
    segment: "Flight",
    details: "Return to PH",
    night: "—",
    fixed: "TO_BOOK",
  },
  {
    date: "Wed Feb 11",
    time: "TBD",
    tz: "PHT",
    route: "(MNL/CEB) → BCD",
    segment: "Flight",
    details: "Position back to home",
    night: "BCD (home)",
    fixed: "TO_BOOK",
  },
  {
    date: "Thu Feb 12–Sat Feb 14",
    time: "All day",
    tz: "PHT",
    route: "Bacolod (BCD)",
    segment: "Stay",
    details: "Home buffer days",
    night: "BCD (home)",
    fixed: "PLANNED",
  },
  {
    date: "Sun Feb 15, 2026",
    time: "11:25 PM → 7:55 PM",
    tz: "PHT→PT",
    route: "MNL → SFO",
    segment: "Flight",
    details: "UA810 (United Economy W)",
    night: "—",
    fixed: "BOOKED",
  },
  {
    date: "Sun Feb 15 → Mon Feb 16",
    time: "9:20 PM → 12:58 AM",
    tz: "PT→MT",
    route: "SFO → DEN",
    segment: "Flight",
    details: "UA301 (United Economy W)",
    night: "—",
    fixed: "BOOKED",
  },
  {
    date: "Mon Feb 16, 2026",
    time: "8:05 AM → 1:59 PM",
    tz: "MT→ET",
    route: "DEN → FLL",
    segment: "Flight",
    details: "UA1469 (United Economy W)",
    night: "—",
    fixed: "BOOKED",
  },
];

const STATUS = {
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

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function SegmentIcon({ segment, className }) {
  const s = (segment || "").toLowerCase();
  const common = classNames("h-4 w-4", className);
  if (s.includes("flight")) return <Plane className={common} />;
  if (s.includes("train") || s.includes("travel")) return <Train className={common} />;
  if (s.includes("bus")) return <Bus className={common} />;
  if (s.includes("check-in")) return <Building2 className={common} />;
  if (s.includes("meal")) return <Utensils className={common} />;
  if (s.includes("ski")) return <MountainSnow className={common} />;
  if (s.includes("prep") || s.includes("pack")) return <Backpack className={common} />;
  if (s.includes("stay")) return <Bed className={common} />;
  if (s.includes("transit") || s.includes("airport")) return <Route className={common} />;
  return <Route className={common} />;
}

function StatusPill({ code }) {
  const meta = STATUS[code] || STATUS.UNSET;
  const Icon = meta.icon;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.cls
      )}
      title={meta.label}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function DayHeader({ title, count, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={classNames(
        "group w-full rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3",
        "hover:bg-zinc-950/80 transition"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-300" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-300" />
          )}
          <div className="text-left">
            <div className="text-sm font-semibold text-zinc-100">{title}</div>
            <div className="text-xs text-zinc-400">{count} item{count === 1 ? "" : "s"}</div>
          </div>
        </div>
        <div className="text-xs text-zinc-400 group-hover:text-zinc-300">Toggle</div>
      </div>
    </button>
  );
}

function TimelineItem({ item }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-2 h-full w-px bg-zinc-800" />
      <div className="absolute left-1.5 top-2 h-5 w-5 rounded-full bg-zinc-950 ring-1 ring-zinc-700 flex items-center justify-center">
        <SegmentIcon segment={item.segment} className="text-zinc-200" />
      </div>

      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">{item.segment}</span>
              <StatusPill code={item.fixed} />
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-200">
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="font-medium">{item.time}</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-300">{item.tz}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-2 text-zinc-200">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <span className="truncate">{item.route}</span>
                </span>
              </div>
              <div className="text-sm text-zinc-300">{item.details}</div>
            </div>
          </div>

          <div className="shrink-0">
            <div className="rounded-lg bg-zinc-900/60 px-3 py-2 ring-1 ring-zinc-800">
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">Night</div>
              <div className="text-sm font-medium text-zinc-200">{item.night || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableView({ rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/60">
      <div className="overflow-auto">
        <table className="min-w-[980px] w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 border-b border-zinc-800">Date</th>
              <th className="px-4 py-3 border-b border-zinc-800">Time</th>
              <th className="px-4 py-3 border-b border-zinc-800">TZ</th>
              <th className="px-4 py-3 border-b border-zinc-800">Start → End</th>
              <th className="px-4 py-3 border-b border-zinc-800">Segment</th>
              <th className="px-4 py-3 border-b border-zinc-800">Details</th>
              <th className="px-4 py-3 border-b border-zinc-800">Night</th>
              <th className="px-4 py-3 border-b border-zinc-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className={classNames(
                  "text-sm text-zinc-200",
                  idx % 2 === 0 ? "bg-zinc-950/30" : "bg-zinc-950/10"
                )}
              >
                <td className="px-4 py-3 border-b border-zinc-900 text-zinc-100 font-medium">
                  {r.date}
                </td>
                <td className="px-4 py-3 border-b border-zinc-900">{r.time}</td>
                <td className="px-4 py-3 border-b border-zinc-900 text-zinc-300">{r.tz}</td>
                <td className="px-4 py-3 border-b border-zinc-900">{r.route}</td>
                <td className="px-4 py-3 border-b border-zinc-900">
                  <span className="inline-flex items-center gap-2">
                    <SegmentIcon segment={r.segment} className="text-zinc-300" />
                    {r.segment}
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-zinc-900 text-zinc-300">
                  {r.details}
                </td>
                <td className="px-4 py-3 border-b border-zinc-900">{r.night}</td>
                <td className="px-4 py-3 border-b border-zinc-900">
                  <StatusPill code={r.fixed} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function normalizeFixed(code) {
  // Map from table-style labels to internal codes.
  // Accepts values already in internal codes.
  const c = (code || "").toUpperCase().replace(/\s+/g, "_");
  if (STATUS[c]) return c;
  if (c.includes("BOOK")) return "BOOKED";
  if (c.includes("TO_BOOK") || c.includes("TO") && c.includes("BOOK")) return "TO_BOOK";
  if (c.includes("BUFFER")) return "BUFFER";
  if (c.includes("PLANNED") && c.includes("WARN")) return "PLANNED_WARN";
  if (c.includes("PLANNED")) return "PLANNED";
  return "UNSET";
}

function makeKeyDate(dateStr) {
  // Lightweight grouping key: strip parenthetical notes to keep "Mon Feb 9" grouped.
  return (dateStr || "").replace(/\s*\(.*?\)\s*/g, "").trim();
}

export default function ItineraryDarkModePage() {
  const [view, setView] = useState("timeline"); // timeline | table
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [segmentFilter, setSegmentFilter] = useState("ALL");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const data = useMemo(() => {
    return ITINERARY.map((x) => ({
      ...x,
      fixed: normalizeFixed(x.fixed),
      dayKey: makeKeyDate(x.date),
    }));
  }, []);

  const segments = useMemo(() => {
    const set = new Set(data.map((d) => d.segment).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (statusFilter !== "ALL" && row.fixed !== statusFilter) return false;
      if (segmentFilter !== "ALL" && row.segment !== segmentFilter) return false;
      if (!q) return true;
      const hay = [
        row.date,
        row.time,
        row.tz,
        row.route,
        row.segment,
        row.details,
        row.night,
        row.fixed,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, query, statusFilter, segmentFilter]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      const k = row.dayKey;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(row);
    }
    return Array.from(map.entries()).map(([k, rows]) => ({
      key: k,
      rows,
    }));
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { total: filtered.length };
    for (const k of Object.keys(STATUS)) c[k] = 0;
    for (const r of filtered) c[r.fixed] = (c[r.fixed] || 0) + 1;
    return c;
  }, [filtered]);

  const toggleDay = (k) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsed(new Set(byDay.map((d) => d.key)));
  };

  const expandAll = () => {
    setCollapsed(new Set());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">Trip Itinerary Timeline</div>
              <div className="text-sm text-zinc-400">
                Dark mode, grouped by day. Search + filter for quick scanning.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setView("timeline")}
                className={classNames(
                  "rounded-lg px-3 py-2 text-sm font-medium ring-1 transition",
                  view === "timeline"
                    ? "bg-zinc-100 text-zinc-950 ring-zinc-200"
                    : "bg-zinc-950 text-zinc-200 ring-zinc-800 hover:bg-zinc-900"
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setView("table")}
                className={classNames(
                  "rounded-lg px-3 py-2 text-sm font-medium ring-1 transition",
                  view === "table"
                    ? "bg-zinc-100 text-zinc-950 ring-zinc-200"
                    : "bg-zinc-950 text-zinc-200 ring-zinc-800 hover:bg-zinc-900"
                )}
              >
                Table
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2">
                <Search className="h-4 w-4 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search: UA flights, cities, segments, notes, address…"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none"
                >
                  <option value="ALL">All statuses ({counts.total})</option>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} ({counts[k] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2">
                <Route className="h-4 w-4 text-zinc-400" />
                <select
                  value={segmentFilter}
                  onChange={(e) => setSegmentFilter(e.target.value)}
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none"
                >
                  <option value="ALL">All segments</option>
                  {segments.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-400">Quick legend:</span>
                <StatusPill code="BOOKED" />
                <StatusPill code="TO_BOOK" />
                <StatusPill code="BUFFER" />
                <StatusPill code="PLANNED" />
                <StatusPill code="PLANNED_WARN" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  Expand all
                </button>
                <button
                  onClick={collapseAll}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  Collapse all
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {view === "table" ? (
          <TableView rows={filtered} />
        ) : (
          <div className="space-y-4">
            {byDay.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-6 text-zinc-300">
                No items match your filters.
              </div>
            ) : (
              byDay.map((d) => {
                const isClosed = collapsed.has(d.key);
                return (
                  <div key={d.key} className="space-y-3">
                    <DayHeader
                      title={d.key}
                      count={d.rows.length}
                      open={!isClosed}
                      onToggle={() => toggleDay(d.key)}
                    />
                    {!isClosed && (
                      <div className="space-y-3">
                        {d.rows.map((row, idx) => (
                          <TimelineItem key={`${d.key}-${idx}`} item={row} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-5">
          <div className="text-sm font-semibold text-zinc-100">Notes / next actions</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>
              Anything marked <span className="font-medium text-rose-200">To book</span> is an open item.
            </li>
            <li>
              For conditional branches (e.g., <span className="font-medium">Joetsu nights X</span>), keep both options visible until you decide.
            </li>
            <li>
              Consider pinning confirmations (booking codes, PDFs) beside each flight/hotel row once you have them.
            </li>
          </ul>
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          Tip: The timeline view is optimized for scanning; the table view is optimized for auditing all columns.
        </div>
      </div>
    </div>
  );
}
