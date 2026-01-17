import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { classNames } from "../../utils/classNames";

export function ShelterSection({ shelter, isExpanded, onToggle }) {
  if (!shelter || Object.keys(shelter).length === 0) return null;

  return (
    <div className="border border-purple-900/50 rounded-lg overflow-hidden bg-purple-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 hover:bg-purple-900/20 transition flex items-center justify-between bg-purple-900/30"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-200">
            🏨 Shelter
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-purple-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-purple-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 py-3 bg-purple-950/10 space-y-2 slide-down">
          {shelter.name && (
            <div>
              <div className="text-sm font-medium text-purple-100">
                {shelter.name}
              </div>
              {shelter.address && (
                <div className="text-xs text-purple-400 mt-0.5">
                  📍 {shelter.address}
                </div>
              )}
              {shelter.type && (
                <div className="text-xs text-purple-400 mt-1">
                  🏠 {shelter.type}
                </div>
              )}
            </div>
          )}

          {/* Show check-in on first day, check-out on last night only */}
          {(shelter.checkIn || (shelter.checkOut && shelter.dayOfStay === shelter.totalStayDays)) && (
            <div className="text-xs text-purple-300 flex flex-wrap gap-x-4 gap-y-1">
              {shelter.checkIn && (
                <span>✓ Check-in: {shelter.checkIn}</span>
              )}
              {shelter.checkOut && shelter.dayOfStay === shelter.totalStayDays && (
                <span>✓ Check-out: {shelter.checkOut}</span>
              )}
            </div>
          )}

          {/* Show stay progress for multi-day stays */}
          {shelter.isMultiDayStay && shelter.dayOfStay && shelter.totalStayDays && (
            <div className="text-xs text-purple-400">
              📅 Night {shelter.dayOfStay} of {shelter.totalStayDays}
            </div>
          )}

          {shelter.notes && (
            <div className="text-xs text-purple-400 bg-purple-950/30 p-2 rounded italic">
              {shelter.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
