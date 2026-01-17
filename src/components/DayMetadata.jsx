import { Plane, MapPin, DollarSign, AlertCircle } from "lucide-react";
import { classNames } from "../utils/classNames";

export function DayMetadata({ day }) {
  if (!day.metadata) return null;

  const { hasTravel, locationFlags, estimatedCost, costCurrencies, unbootedCount, hasUnbooked } = day.metadata;

  return (
    <div className="flex items-center gap-4 flex-wrap mt-2">
      {/* Travel indicator */}
      {hasTravel && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-800/50 border border-blue-600/60">
          <Plane className="h-5 w-5 text-blue-300" />
          <span className="text-base font-medium text-blue-200">Travel Day</span>
        </div>
      )}

      {/* Location flags */}
      {locationFlags && locationFlags.length > 0 && (
        <div className="flex items-center gap-3">
          {locationFlags.map((flag, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-purple-800/40 border border-purple-600/50"
            >
              <MapPin className="h-5 w-5 text-purple-300" />
              <span className="text-base font-medium text-purple-200">{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cost indicator */}
      {estimatedCost > 0 && costCurrencies && costCurrencies.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-800/50 border border-amber-600/60">
          <DollarSign className="h-5 w-5 text-amber-300" />
          <span className="text-base font-medium text-amber-200">
            {estimatedCost.toLocaleString()}
            <span className="ml-1 text-amber-300">
              {costCurrencies.join("/")}
            </span>
          </span>
        </div>
      )}

      {/* Unbooked items warning */}
      {hasUnbooked && unbootedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-800/50 border border-red-600/60">
          <AlertCircle className="h-5 w-5 text-red-300" />
          <span className="text-base font-medium text-red-200">
            {unbootedCount} to book
          </span>
        </div>
      )}
    </div>
  );
}
