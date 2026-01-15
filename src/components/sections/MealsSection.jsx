import { ChevronDown, ChevronRight, Utensils } from "lucide-react";
import { classNames } from "../../utils/classNames";

export function MealsSection({ meals, isExpanded, onToggle }) {
  if (!meals || meals.length === 0) return null;

  return (
    <div className="border border-amber-900/50 rounded-lg overflow-hidden bg-amber-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 hover:bg-amber-900/20 transition flex items-center justify-between bg-amber-900/30"
      >
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-200">
            🍽️ Meals <span className="text-amber-500">({meals.length})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-amber-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-400" />
        )}
      </button>

      {isExpanded && (
        <div className="divide-y divide-amber-900/30 bg-amber-950/10">
          {meals.map((meal, idx) => (
            <div key={idx} className="px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-amber-100">
                    {meal.type}
                  </div>
                  {meal.location && (
                    <div className="text-xs text-amber-400 mt-0.5">
                      📍 {meal.location}
                    </div>
                  )}
                  {meal.details && (
                    <div className="text-xs text-amber-300 mt-0.5">
                      {meal.details}
                    </div>
                  )}
                </div>
                {meal.time && (
                  <div className="text-xs text-amber-400 whitespace-nowrap">
                    ⏰ {meal.time}
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
