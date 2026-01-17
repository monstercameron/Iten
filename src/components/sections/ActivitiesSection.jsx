import { ChevronDown, ChevronRight, MapPin, X, ExternalLink, Clock, DollarSign, Pencil, Trash2 } from "lucide-react";
import { classNames } from "../../utils/classNames";
import { ActivityMapPreview } from "../ActivityMapPreview";

// Generate Google Maps URL for a location
function getGoogleMapsUrl(activity) {
  if (activity.coordinates?.lat && activity.coordinates?.lng) {
    const query = encodeURIComponent(activity.location || activity.name);
    return `https://www.google.com/maps/search/?api=1&query=${query}&center=${activity.coordinates.lat},${activity.coordinates.lng}`;
  }
  // Fallback to search by name
  const query = encodeURIComponent(activity.location || activity.name);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

const priorityStyles = {
  high: "border-l-amber-500 bg-amber-950/20",
  medium: "border-l-teal-500 bg-teal-950/10",
  low: "border-l-zinc-600 bg-zinc-900/20"
};

const categoryColors = {
  Sports: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  Food: "bg-orange-900/40 text-orange-300 border-orange-700/50",
  Sightseeing: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  Shopping: "bg-pink-900/40 text-pink-300 border-pink-700/50",
  Logistics: "bg-zinc-800/60 text-zinc-300 border-zinc-600/50",
  Relaxation: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  Family: "bg-rose-900/40 text-rose-300 border-rose-700/50",
  Rest: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
  Entertainment: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  Cultural: "bg-red-900/40 text-red-300 border-red-700/50",
  Personal: "bg-slate-900/40 text-slate-300 border-slate-600/50",
  Transport: "bg-sky-900/40 text-sky-300 border-sky-700/50",
  Outdoor: "bg-green-900/40 text-green-300 border-green-700/50",
  Nightlife: "bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700/50"
};

export function ActivitiesSection({ 
  items, 
  isExpanded, 
  onToggle,
  manualActivityIds = [],
  onRemoveActivity,
  onEditActivity
}) {
  if (!items || items.length === 0) return null;

  const isManualActivity = (activity) => {
    return manualActivityIds.includes(activity.id);
  };

  return (
    <div className="border border-teal-900/50 rounded-lg overflow-hidden bg-teal-950/20">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 hover:bg-teal-900/20 transition flex items-center justify-between bg-teal-900/30"
      >
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-teal-400" />
          <span className="text-base font-medium text-teal-200">
            🎯 Activities <span className="text-teal-500">({items.length})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-teal-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-teal-400" />
        )}
      </button>

      {isExpanded && (() => {
        // Dynamic height: ~110px per activity for 1-3, fixed at 330px for 3+
        const itemCount = Math.min(items.length, 3);
        const containerHeight = itemCount * 110;
        
        return (
        <div className="p-4 bg-teal-950/10 slide-down">
          {/* 2 Column Layout: Activities left (60%), Map right (40%) */}
          <div className="flex gap-4" style={{ height: `${containerHeight}px` }}>
            {/* LEFT COLUMN - Activity List (60%) - scrollable when > 3 items */}
            <div className={classNames(
              "w-[60%] min-w-0 space-y-2 pr-2",
              items.length > 3 ? "overflow-y-auto" : ""
            )}>
              {items.map((activity, idx) => (
                <div 
                  key={activity.id || idx} 
                  className={classNames(
                    "px-4 py-3 border-l-3 rounded-lg relative group",
                    priorityStyles[activity.priority] || priorityStyles.medium,
                    isManualActivity(activity) && "ring-1 ring-blue-700/50"
                  )}
                >
                  {/* Edit & Delete buttons for manual activities */}
                  {isManualActivity(activity) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditActivity && (
                        <button
                          onClick={() => onEditActivity(activity)}
                          className="p-1.5 rounded-md bg-amber-900/50 hover:bg-amber-700/50 text-amber-300 transition-colors"
                          title="Edit activity"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onRemoveActivity && (
                        <button
                          onClick={() => onRemoveActivity(activity.id)}
                          className="p-1.5 rounded-md bg-red-900/50 hover:bg-red-700/50 text-red-300 transition-colors"
                          title="Delete activity"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Activity header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Activity number badge */}
                      <span className="text-sm font-bold bg-teal-700/60 text-teal-100 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      {activity.icon && (
                        <span className="text-lg">{activity.icon}</span>
                      )}
                      <span className="text-base font-medium text-teal-100 truncate">
                        {activity.name}
                      </span>
                    </div>
                    
                    {/* Time on right */}
                    {(activity.timeStart || activity.time) && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-900/40 border border-teal-700/50 text-sm text-teal-200 flex-shrink-0">
                        <Clock className="h-3.5 w-3.5 text-teal-400" />
                        <span>
                          {activity.timeStart || activity.time}
                          {activity.timeEnd && ` → ${activity.timeEnd}`}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags row */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {activity.category && (
                      <span className={classNames(
                        "text-sm px-2.5 py-1 rounded-full border",
                        categoryColors[activity.category] || "bg-zinc-800 text-zinc-300 border-zinc-600/50"
                      )}>
                        {activity.category}
                      </span>
                    )}
                    {isManualActivity(activity) && (
                      <span className="text-sm px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
                        ✨ Manual
                      </span>
                    )}
                    {activity.estimatedCost && (
                      <span className="flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                        <DollarSign className="h-3.5 w-3.5" />
                        {activity.estimatedCost.toLocaleString()} {activity.currency}
                      </span>
                    )}
                  </div>
                  
                  {/* Location row */}
                  {activity.location && (
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4 text-teal-400 flex-shrink-0" />
                      <span className="text-sm text-teal-300 truncate">
                        {activity.location}
                      </span>
                      <a
                        href={getGoogleMapsUrl(activity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-teal-500 hover:text-teal-300 transition-colors flex-shrink-0 ml-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* RIGHT COLUMN - Map (40%) - stretches full height */}
            <div className="w-[40%] flex-shrink-0">
              <ActivityMapPreview activities={items} height={containerHeight} />
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
