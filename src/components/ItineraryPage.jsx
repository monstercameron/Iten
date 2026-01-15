import { useState, useMemo } from "react";
import { Search, Eye, EyeOff } from "lucide-react";
import { ITINERARY_DAYS } from "../data/itinerary";
import { DayCard } from "./DayCard";
import { classNames } from "../utils/classNames";

export function ItineraryPage() {
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [showBackupPlans, setShowBackupPlans] = useState(false);
  const [query, setQuery] = useState("");

  // Filtered itinerary based on search query
  const filteredItinerary = useMemo(() => {
    if (!query.trim()) return ITINERARY_DAYS;

    const lowerQuery = query.toLowerCase();
    return ITINERARY_DAYS.filter((day) => {
      return (
        day.dateDisplay.toLowerCase().includes(lowerQuery) ||
        day.summary.toLowerCase().includes(lowerQuery) ||
        day.timezone.toLowerCase().includes(lowerQuery)
      );
    });
  }, [query]);

  // Toggle day expanded state
  const toggleDay = (dayKey) => {
    const newSet = new Set(expandedDays);
    if (newSet.has(dayKey)) {
      newSet.delete(dayKey);
    } else {
      newSet.add(dayKey);
    }
    setExpandedDays(newSet);
  };

  // Toggle section expanded state (format: "dayKey:sectionName")
  const toggleSection = (dayKey, sectionName) => {
    const key = `${dayKey}:${sectionName}`;
    const newSet = new Set(expandedSections);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedSections(newSet);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-white mb-6">✈️ Travel Itinerary</h1>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by date, location, or timezone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                setShowBackupPlans(!showBackupPlans)
              }
              className={classNames(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition",
                showBackupPlans
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              )}
            >
              {showBackupPlans ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {showBackupPlans ? "Hide Backup Plans" : "Show Backup Plans"}
            </button>
          </div>

          {/* Summary */}
          <div className="text-sm text-zinc-400">
            Showing {filteredItinerary.length} of {ITINERARY_DAYS.length} days
          </div>
        </div>
      </div>

      {/* Days list */}
      <div className="max-w-6xl mx-auto space-y-4">
        {filteredItinerary.map((day) => (
          <DayCard
            key={day.dateKey}
            day={day}
            isExpanded={expandedDays.has(day.dateKey)}
            onToggle={() => toggleDay(day.dateKey)}
            expandedSections={expandedSections}
            onToggleSection={(sectionName) =>
              toggleSection(day.dateKey, sectionName)
            }
            showBackupPlans={showBackupPlans}
          />
        ))}

        {filteredItinerary.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-lg">No days match your search.</p>
            <p className="text-sm mt-2">Try adjusting your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
