import { ChevronDown, ChevronRight, Building2, MapPin, Home, Clock, Calendar, StickyNote } from "lucide-react";
import { classNames } from "../../utils/classNames";
import { MapPreview } from "../MapPreview";

export function ShelterSection({ shelter, isExpanded, onToggle }) {
  if (!shelter || Object.keys(shelter).length === 0) return null;

  return (
    <div className="border border-purple-900/50 rounded-lg overflow-hidden bg-purple-950/20">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 hover:bg-purple-900/20 transition flex items-center justify-between bg-purple-900/30"
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-purple-400" />
          <span className="text-base font-medium text-purple-200">
            🏨 Shelter
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-purple-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-purple-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-purple-950/10 slide-down">
          {/* 2 Column Layout: Details left (60%), Map right (40%) */}
          <div className="flex gap-4">
            {/* LEFT COLUMN - Shelter details (60%) */}
            <div className="w-[60%] min-w-0 flex flex-col gap-4">
              {/* Top: Name & Type */}
              <div>
                {shelter.name && (
                  <div className="mb-3">
                    <div className="text-lg font-semibold text-purple-100">
                      {shelter.name}
                    </div>
                    {shelter.address && (
                      <div className="flex items-center gap-2 text-sm text-purple-300 mt-1">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        <span>{shelter.address}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: Tags row */}
              <div className="flex flex-wrap items-center gap-3">
                {shelter.type && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/40 border border-purple-700/50 text-sm text-purple-200">
                    <Home className="h-4 w-4 text-purple-400" />
                    <span>{shelter.type}</span>
                  </div>
                )}
                {shelter.checkIn && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-sm text-emerald-200">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <span>Check-in: {shelter.checkIn}</span>
                  </div>
                )}
                {shelter.checkOut && shelter.dayOfStay === shelter.totalStayDays && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-sm text-amber-200">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>Check-out: {shelter.checkOut}</span>
                  </div>
                )}
                {shelter.isMultiDayStay && shelter.dayOfStay && shelter.totalStayDays && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-900/40 border border-indigo-700/50 text-sm text-indigo-200">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    <span>Night {shelter.dayOfStay} of {shelter.totalStayDays}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - Map (40%) */}
            {shelter.coordinates && (
              <div className="w-[40%] flex-shrink-0 h-[140px]">
                <MapPreview
                  coordinates={shelter.coordinates}
                  name={shelter.name}
                  address={shelter.address}
                  type={shelter.type}
                />
              </div>
            )}
          </div>

          {/* Notes row */}
          {shelter.notes && (
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-purple-900/30 text-sm text-purple-300">
              <StickyNote className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span className="italic">{shelter.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
