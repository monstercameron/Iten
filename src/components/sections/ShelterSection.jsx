import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, MapPin, Home, Clock, Calendar, StickyNote, Copy, Check } from "lucide-react";
import { classNames } from "../../utils/classNames";
import { MapPreview } from "../MapPreview";

export function ShelterSection({ shelter, isExpanded, onToggle }) {
  const [copiedAddress, setCopiedAddress] = useState(false);

  if (!shelter || Object.keys(shelter).length === 0) return null;

  const handleCopyAddress = async (e) => {
    e.stopPropagation();
    if (shelter.address) {
      try {
        await navigator.clipboard.writeText(shelter.address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  return (
    <div className="border border-purple-900/50 rounded-lg overflow-hidden bg-purple-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 md:px-4 py-2.5 md:py-3 hover:bg-purple-900/20 transition flex items-center justify-between bg-purple-900/30"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
          <span className="text-sm md:text-base font-medium text-purple-200">
            🏨 Shelter
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
        ) : (
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 md:p-4 bg-purple-950/10 slide-down">
          {/* 2 Column Layout: Details left (60%), Map right (40%) - stacked on mobile */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* LEFT COLUMN - Shelter details (60% on desktop, full on mobile) */}
            <div className="w-full md:w-[60%] min-w-0 flex flex-col gap-3 md:gap-4">
              {/* Top: Name & Type */}
              <div>
                {shelter.name && (
                  <div className="mb-2 md:mb-3">
                    <div className="text-base md:text-lg font-semibold text-purple-100">
                      {shelter.name}
                    </div>
                    {shelter.address && (
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-purple-300 mt-1">
                        <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400" />
                        <span className="truncate">{shelter.address}</span>
                        <button
                          onClick={handleCopyAddress}
                          className={classNames(
                            "p-1 rounded transition-colors flex-shrink-0",
                            copiedAddress
                              ? "text-emerald-400"
                              : "text-purple-400 hover:text-purple-200 hover:bg-purple-800/50"
                          )}
                          title={copiedAddress ? "Copied!" : "Copy address"}
                        >
                          {copiedAddress ? <Check className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <Copy className="h-3 w-3 md:h-3.5 md:w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: Tags row */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {shelter.type && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-purple-900/40 border border-purple-700/50 text-xs md:text-sm text-purple-200">
                    <Home className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400" />
                    <span>{shelter.type}</span>
                  </div>
                )}
                {shelter.checkIn && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-xs md:text-sm text-emerald-200">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-400" />
                    <span>Check-in: {shelter.checkIn}</span>
                  </div>
                )}
                {shelter.checkOut && shelter.dayOfStay === shelter.totalStayDays && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-xs md:text-sm text-amber-200">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
                    <span>Check-out: {shelter.checkOut}</span>
                  </div>
                )}
                {shelter.isMultiDayStay && shelter.dayOfStay && shelter.totalStayDays && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-indigo-900/40 border border-indigo-700/50 text-xs md:text-sm text-indigo-200">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-400" />
                    <span>Night {shelter.dayOfStay} of {shelter.totalStayDays}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - Map (40% on desktop, hidden on mobile) */}
            {shelter.coordinates && (
              <div className="hidden md:block w-[40%] flex-shrink-0 h-[140px]">
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
            <div className="flex items-start gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-purple-900/30 text-xs md:text-sm text-purple-300">
              <StickyNote className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span className="italic">{shelter.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
