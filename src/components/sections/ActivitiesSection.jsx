import { ChevronDown, ChevronRight, MapPin, X } from "lucide-react";
import { classNames } from "../../utils/classNames";

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
        <div className="divide-y divide-teal-900/30 bg-teal-950/10">
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
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activity.icon && (
                      <span className="text-base">{activity.icon}</span>
                    )}
                    <span className="text-sm font-medium text-teal-100">
                      {activity.name}
                    </span>
                    {isManualActivity(activity) && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
                        Manual
                      </span>
                    )}
                    {activity.category && (
                      <span className={classNames(
                        "text-xs px-1.5 py-0.5 rounded",
                        categoryColors[activity.category] || "bg-zinc-800 text-zinc-300"
                      )}>
                        {activity.category}
                      </span>
                    )}
                  </div>
                  {activity.location && (
                    <div className="text-xs text-teal-400 mt-0.5">
                      📍 {activity.location}
                    </div>
                  )}
                  {activity.notes && (
                    <div className="text-xs text-teal-300/70 mt-0.5 italic">
                      {activity.notes}
                    </div>
                  )}
                  {activity.estimatedCost && (
                    <div className="text-xs text-amber-400 mt-0.5">
                      💰 {activity.estimatedCost.toLocaleString()} {activity.currency}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {(activity.timeStart || activity.time) && (
                    <div className="text-xs text-teal-400 whitespace-nowrap">
                      ⏰ {activity.timeStart || activity.time}
                      {activity.timeEnd && ` - ${activity.timeEnd}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
