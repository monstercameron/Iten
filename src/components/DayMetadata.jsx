import { Plane, MapPin, DollarSign, AlertCircle } from "lucide-react";
import { classNames } from "../utils/classNames";

export function DayMetadata({ day }) {
  if (!day.metadata) return null;

  const { hasTravel, locationFlags, estimatedCost, costCurrencies, unbootedCount, hasUnbooked } = day.metadata;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Travel indicator */}
      {hasTravel && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-900/40 border border-blue-700/50">
          <Plane className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium text-blue-300">Travel Day</span>
        </div>
      )}

      {/* Location flags */}
      {locationFlags && locationFlags.length > 0 && (
        <div className="flex items-center gap-2">
          {locationFlags.map((flag, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-900/30 border border-purple-700/40"
            >
              <MapPin className="h-3 w-3 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cost indicator */}
      {estimatedCost > 0 && costCurrencies && costCurrencies.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900/40 border border-amber-700/50">
          <DollarSign className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-300">
            {estimatedCost.toLocaleString()}
            <span className="ml-1 text-amber-400">
              {costCurrencies.join("/")}
            </span>
          </span>
        </div>
      )}

      {/* Unbooked items warning */}
      {hasUnbooked && unbootedCount > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-900/40 border border-red-700/50">
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs font-medium text-red-300">
            {unbootedCount} to book
          </span>
        </div>
      )}
    </div>
  );
}
