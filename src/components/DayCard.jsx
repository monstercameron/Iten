import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Plus } from "lucide-react";
import { TravelSection } from "./sections/TravelSection";
import { ShelterSection } from "./sections/ShelterSection";
import { MealsSection } from "./sections/MealsSection";
import { ActivitiesSection } from "./sections/ActivitiesSection";
import { DayMetadata } from "./DayMetadata";
import AddActivityModal from "./AddActivityModal";
import { MapPreview } from "./MapPreview";
import { classNames } from "../utils/classNames";

const sectionNames = {
  travel: "travel",
  shelter: "shelter",
  meals: "meals",
  activities: "activities",
};

// Region badge styling based on timezone region
const regionConfig = {
  'US': { flag: '🇺🇸', label: 'US', bg: 'bg-blue-900/40', border: 'border-blue-700/50', text: 'text-blue-300' },
  'PH': { flag: '🇵🇭', label: 'PH', bg: 'bg-yellow-900/40', border: 'border-yellow-700/50', text: 'text-yellow-300' },
  'JP': { flag: '🇯🇵', label: 'JP', bg: 'bg-red-900/40', border: 'border-red-700/50', text: 'text-red-300' },
};

function getRegionBadge(timezone, tz) {
  // Check for explicit region first
  if (tz === 'US' || timezone?.includes('ET') || timezone?.includes('PT') || timezone?.includes('MT')) {
    return regionConfig['US'];
  }
  if (tz === 'JP' || timezone?.includes('JST')) {
    return regionConfig['JP'];
  }
  if (tz === 'PH' || timezone?.includes('PHT')) {
    return regionConfig['PH'];
  }
  return regionConfig['US']; // default
}

// Format a day's itinerary as copyable text
function formatDayAsText(day) {
  const lines = [];
  const region = getRegionBadge(day.timezone, day.tz);
  
  // Header
  lines.push(`📅 ${day.dateDisplay} ${region.flag}`);
  lines.push(`📍 ${day.summary}`);
  if (day.isInFlight) lines.push(`✈️ In Flight (crossing date line)`);
  lines.push('');
  
  // Metadata
  if (day.metadata) {
    const meta = day.metadata;
    if (meta.hasTravel) lines.push('🛫 Travel Day');
    if (meta.locationFlags?.length > 0) lines.push(`📌 Locations: ${meta.locationFlags.join(', ')}`);
    if (meta.estimatedCost > 0) lines.push(`💰 Est. Cost: ${meta.estimatedCost.toLocaleString()} ${meta.costCurrencies?.join('/')}`);
    if (meta.hasUnbooked) lines.push(`⚠️ ${meta.unbootedCount} item(s) to book`);
    if (meta.hasTravel || meta.estimatedCost > 0 || meta.hasUnbooked) lines.push('');
  }
  
  // Travel
  if (day.travel?.length > 0) {
    lines.push('✈️ TRAVEL:');
    day.travel.forEach(t => {
      const status = t.status === 'BOOKED' ? '✅' : t.status === 'TO_BOOK' ? '⚠️' : '📋';
      lines.push(`  ${status} ${t.route || t.location || 'Transit'}`);
      if (t.timeStart) lines.push(`     🕐 ${t.timeStart}${t.timeEnd ? ' → ' + t.timeEnd : ''}`);
      if (t.details) lines.push(`     ${t.details}`);
      if (t.flightNumber) lines.push(`     Flight: ${t.flightNumber} (${t.airline || ''})`);
    });
    lines.push('');
  }
  
  // Shelter
  if (day.shelter) {
    lines.push('🏨 ACCOMMODATION:');
    lines.push(`  ${day.shelter.name || 'TBD'}`);
    if (day.shelter.address) lines.push(`  📍 ${day.shelter.address}`);
    if (day.shelter.notes) lines.push(`  📝 ${day.shelter.notes}`);
    lines.push('');
  }
  
  // Activities
  if (day.activities?.length > 0) {
    lines.push('🎯 ACTIVITIES:');
    day.activities.forEach(a => {
      lines.push(`  • ${a.details || a.name || 'Activity'}`);
      if (a.timeStart) lines.push(`    🕐 ${a.timeStart}${a.timeEnd ? ' - ' + a.timeEnd : ''}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function DayCard({
  day,
  isExpanded,
  onToggle,
  expandedSections,
  onToggleSection,
  showBackupPlans,
  manualActivities = [],
  onAddActivity,
  onRemoveActivity,
}) {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Combine parsed activities with manually added ones
  const allActivities = [...(day.activities || []), ...manualActivities];

  const isSectionExpanded = (sectionName) => {
    return expandedSections.has(`${day.dateKey}:${sectionName}`);
  };

  const region = getRegionBadge(day.timezone, day.tz);

  const handleCopy = async (e) => {
    e.stopPropagation(); // Prevent card toggle
    const text = formatDayAsText(day);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddActivity = (activity) => {
    onAddActivity?.(activity, day.dateKey);
  };

  const handleRemoveActivity = (activityId) => {
    onRemoveActivity?.(activityId, day.dateKey);
  };

  // Check if this day is today
  const today = new Date().toISOString().split('T')[0];
  const isToday = day.dateKey === today;

  return (
    <div 
      id={`day-${day.dateKey}`}
      className={classNames(
        "rounded-2xl border overflow-hidden",
        isToday && "ring-2 ring-blue-500 ring-offset-4 ring-offset-zinc-950",
      day.metadata?.hasUnbooked
        ? "border-red-600/80 bg-zinc-900 shadow-lg shadow-red-900/30"
        : "border-zinc-700 bg-zinc-900"
    )}>
      {/* Map Preview - Always visible at top */}
      {day.shelter?.coordinates && (
        <div className="relative">
          <MapPreview
            coordinates={day.shelter.coordinates}
            name={day.shelter.name}
            address={day.shelter.address}
            type={day.shelter.type}
          />
        </div>
      )}

      {/* Day Header */}
      <div
        onClick={onToggle}
        className="w-full px-5 py-4 hover:bg-zinc-800/50 transition flex flex-col gap-3 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 text-left">
            {isExpanded ? (
              <ChevronDown className="h-6 w-6 text-zinc-300" />
            ) : (
              <ChevronRight className="h-6 w-6 text-zinc-300" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white">{day.dateDisplay}</span>
                {isToday && (
                  <span className="px-2.5 py-1 text-xs font-bold bg-blue-500 text-white rounded-full">
                    TODAY
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-300 mt-1">
                {day.summary}
                {day.isInFlight && (
                  <span className="ml-2 text-sky-400 font-medium">✈️ In Flight</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={classNames(
                "p-2 rounded-lg border transition-all",
                copied
                  ? "bg-emerald-800/60 border-emerald-500/60 text-emerald-300"
                  : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              )}
              title={copied ? "Copied!" : "Copy day itinerary"}
            >
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
            {/* Region Badge */}
            <div className={classNames(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold",
              region.bg, region.border, region.text
            )}>
              <span>{region.flag}</span>
              <span>{day.timezone}</span>
            </div>
          </div>
        </div>

        {/* Metadata row */}
        <DayMetadata day={day} />
      </div>

      {/* Day Content */}
      {isExpanded && (
        <div className="border-t border-zinc-700 p-5 space-y-5">
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
            items={allActivities}
            isExpanded={isSectionExpanded(sectionNames.activities)}
            onToggle={() => onToggleSection(sectionNames.activities)}
            manualActivityIds={manualActivities.map(a => a.id)}
            onRemoveActivity={handleRemoveActivity}
          />

          {/* Add Activity Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2 px-4 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-xl text-zinc-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Activity
          </button>
        </div>
      )}

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddActivity}
        date={day.dateKey}
      />
    </div>
  );
}
