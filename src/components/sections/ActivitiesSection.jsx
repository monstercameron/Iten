import { ChevronDown, ChevronRight, MapPin, X, ExternalLink } from "lucide-react";
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
  Sports: "bg-blue-900/40 text-blue-300",
  Food: "bg-orange-900/40 text-orange-300",
  Sightseeing: "bg-purple-900/40 text-purple-300",
  Shopping: "bg-pink-900/40 text-pink-300",
  Logistics: "bg-zinc-800/60 text-zinc-300",
  Relaxation: "bg-cyan-900/40 text-cyan-300",
  Family: "bg-rose-900/40 text-rose-300",
  Rest: "bg-indigo-900/40 text-indigo-300",
  Entertainment: "bg-violet-900/40 text-violet-300",
  Cultural: "bg-red-900/40 text-red-300",
  Personal: "bg-slate-900/40 text-slate-300",
  Transport: "bg-sky-900/40 text-sky-300",
  Outdoor: "bg-green-900/40 text-green-300",
  Nightlife: "bg-fuchsia-900/40 text-fuchsia-300"
};

export function ActivitiesSection({ 
  items, 
  isExpanded, 
  onToggle,
  manualActivityIds = [],
  onRemoveActivity 
}) {
  if (!items || items.length === 0) return null;

  const isManualActivity = (activity) => {
    return manualActivityIds.includes(activity.id);
  };

  return (
    <div className="border border-teal-900/50 rounded-lg overflow-hidden bg-teal-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 hover:bg-teal-900/20 transition flex items-center justify-between bg-teal-900/30"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-medium text-teal-200">
            🎯 Activities <span className="text-teal-500">({items.length})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-teal-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-teal-400" />
        )}
      </button>

      {isExpanded && (
        <div className="flex flex-col p-3 gap-3 slide-down mb-3">
          {/* Activity Map - sized to content */}
          <div className="w-full">
            <ActivityMapPreview activities={items} height={180} />
          </div>
          
          {/* Activity List - auto height based on content */}
          <div className="w-full divide-y divide-teal-900/30 bg-teal-950/10 rounded-lg">
            {items.map((activity, idx) => (
              <div 
                key={activity.id || idx} 
                className={classNames(
                  "px-3 py-2 border-l-2 relative group",
                  priorityStyles[activity.priority] || priorityStyles.medium,
                  isManualActivity(activity) && "bg-blue-950/10"
                )}
              >
                {/* Remove button for manual activities */}
                {isManualActivity(activity) && onRemoveActivity && (
                  <button
                    onClick={() => onRemoveActivity(activity.id)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-red-900/50 hover:bg-red-700/50 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove activity"
                  >
                    <X size={12} />
                  </button>
                )}
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Activity number badge */}
                      <span className="text-xs font-bold bg-teal-700/50 text-teal-200 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      {activity.icon && (
                        <span className="text-sm">{activity.icon}</span>
                      )}
                      <span className="text-sm font-medium text-teal-100 truncate">
                        {activity.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {activity.category && (
                        <span className={classNames(
                          "text-xs px-1.5 py-0.5 rounded",
                          categoryColors[activity.category] || "bg-zinc-800 text-zinc-300"
                        )}>
                          {activity.category}
                        </span>
                      )}
                      {isManualActivity(activity) && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
                          Manual
                        </span>
                      )}
                    </div>
                    {activity.location && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-teal-400 truncate">
                          📍 {activity.location}
                        </span>
                        <a
                          href={getGoogleMapsUrl(activity)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-teal-500 hover:text-teal-300 transition-colors flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    {activity.estimatedCost && (
                      <div className="text-xs text-amber-400 mt-0.5">
                        💰 {activity.estimatedCost.toLocaleString()} {activity.currency}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {(activity.timeStart || activity.time) && (
                      <div className="text-xs text-teal-400 whitespace-nowrap">
                        {activity.timeStart || activity.time}
                      </div>
                    )}
                    {activity.timeEnd && (
                      <div className="text-xs text-teal-500 whitespace-nowrap">
                        → {activity.timeEnd}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
