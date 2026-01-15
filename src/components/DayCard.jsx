import { ChevronDown, ChevronRight } from "lucide-react";
import { TravelSection } from "./sections/TravelSection";
import { ShelterSection } from "./sections/ShelterSection";
import { MealsSection } from "./sections/MealsSection";
import { ActivitiesSection } from "./sections/ActivitiesSection";
import { DayMetadata } from "./DayMetadata";
import { classNames } from "../utils/classNames";

const sectionNames = {
  travel: "travel",
  shelter: "shelter",
  meals: "meals",
  activities: "activities",
};

export function DayCard({
  day,
  isExpanded,
  onToggle,
  expandedSections,
  onToggleSection,
  showBackupPlans,
}) {
  const isSectionExpanded = (sectionName) => {
    return expandedSections.has(`${day.dateKey}:${sectionName}`);
  };

  return (
    <div className={classNames(
      "rounded-2xl border overflow-hidden",
      day.metadata?.hasUnbooked
        ? "border-red-700/60 bg-zinc-950/80 shadow-lg shadow-red-900/20"
        : "border-zinc-800/70 bg-zinc-950/60"
    )}>
      {/* Day Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 hover:bg-zinc-900/40 transition flex flex-col gap-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 text-left">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            )}
            <div>
              <div className="font-semibold text-zinc-100">{day.dateDisplay}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{day.summary}</div>
            </div>
          </div>
          <div className="text-xs font-medium text-zinc-400">{day.timezone}</div>
        </div>

        {/* Metadata row */}
        <DayMetadata day={day} />
      </button>

      {/* Day Content */}
      {isExpanded && (
        <div className="border-t border-zinc-800/50 p-4 space-y-4">
          {/* Travel Section */}
          <TravelSection
            items={day.travel}
            isExpanded={isSectionExpanded(sectionNames.travel)}
            onToggle={() => onToggleSection(sectionNames.travel)}
            showBackupPlans={showBackupPlans}
          />

          {/* Shelter Section */}
          {day.shelter && (
            <ShelterSection
              shelter={day.shelter}
              isExpanded={isSectionExpanded(sectionNames.shelter)}
              onToggle={() => onToggleSection(sectionNames.shelter)}
            />
          )}

          {/* Meals Section */}
          <MealsSection
            items={day.meals}
            isExpanded={isSectionExpanded(sectionNames.meals)}
            onToggle={() => onToggleSection(sectionNames.meals)}
          />

          {/* Activities Section */}
          <ActivitiesSection
            items={day.activities}
            isExpanded={isSectionExpanded(sectionNames.activities)}
            onToggle={() => onToggleSection(sectionNames.activities)}
          />
        </div>
      )}
    </div>
  );
}
