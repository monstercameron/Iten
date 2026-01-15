import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { classNames } from "../../utils/classNames";

export function ActivitiesSection({ activities, isExpanded, onToggle }) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="border border-teal-900/50 rounded-lg overflow-hidden bg-teal-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 hover:bg-teal-900/20 transition flex items-center justify-between bg-teal-900/30"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-medium text-teal-200">
            🎯 Activities <span className="text-teal-500">({activities.length})</span>
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
          {activities.map((activity, idx) => (
            <div key={idx} className="px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-teal-100">
                    {activity.name}
                  </div>
                  {activity.location && (
                    <div className="text-xs text-teal-400 mt-0.5">
                      📍 {activity.location}
                    </div>
                  )}
                  {activity.description && (
                    <div className="text-xs text-teal-300 mt-0.5">
                      {activity.description}
                    </div>
                  )}
                </div>
                {activity.time && (
                  <div className="text-xs text-teal-400 whitespace-nowrap">
                    ⏰ {activity.time}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
