import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plane, Clock, Timer, MapPin, Armchair, Coffee, Hourglass, ShieldCheck } from "lucide-react";
import { StatusPill } from "../StatusPill";
import { TravelRouteMap } from "../TravelRouteMap";
import { classNames } from "../../utils/classNames";

// Check if item is a buffer segment
const isBufferSegment = (item) => item.status === 'BUFFER';

// Buffer segment component - special attractive styling
function BufferSegmentCard({ item }) {
  return (
    <div className="p-3 md:p-4">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-950/40 via-purple-950/30 to-indigo-950/40 border border-violet-700/40 p-4 md:p-5">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500 rounded-full blur-3xl" />
        </div>
        
        <div className="relative flex items-center gap-3 md:gap-5">
          {/* Icon container */}
          <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/40 flex items-center justify-center">
            <Hourglass className="w-6 h-6 md:w-8 md:h-8 text-violet-300" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
              <h3 className="text-base md:text-lg font-semibold text-violet-100">
                ⏳ Buffer Time
              </h3>
              <StatusPill code={item.status} />
            </div>
            
            <p className="text-violet-200/80 text-xs md:text-sm mb-2 md:mb-3 truncate">
              {item.details || item.route || 'Scheduled buffer period'}
            </p>
            
            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {item.time && (
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-violet-800/40 border border-violet-600/50 text-xs md:text-sm text-violet-200">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
                  <span>{item.time}</span>
                </div>
              )}
              {item.location && (
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-violet-800/40 border border-violet-600/50 text-xs md:text-sm text-violet-200">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
                  <span>{item.location}</span>
                </div>
              )}
              {item.type && item.type !== 'Buffer' && (
                <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-indigo-800/40 border border-indigo-600/50 text-xs md:text-sm text-indigo-200">
                  <Coffee className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-400" />
                  <span>{item.type}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side decorative element */}
          <div className="hidden sm:flex flex-col items-center gap-2 text-violet-400/60">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-medium uppercase tracking-wider">Safe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TravelSection({ items, isExpanded, onToggle, showBackupPlans }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border border-blue-900/50 rounded-lg overflow-hidden bg-blue-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 md:px-4 py-2.5 md:py-3 hover:bg-blue-900/20 transition flex items-center justify-between bg-blue-900/30"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Plane className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
          <span className="text-sm md:text-base font-medium text-blue-200">
            ✈️ Travel <span className="text-blue-500">({items.length})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
        ) : (
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
        )}
      </button>

      {isExpanded && (
        <div className="divide-y divide-blue-900/30 bg-blue-950/10 slide-down mb-3">
          {items.map((item) => (
            // Render buffer segments with special styling
            isBufferSegment(item) ? (
              <BufferSegmentCard key={item.id} item={item} />
            ) : (
            <div key={item.id} className="p-3 md:p-4">
              {/* 2 Column Layout: Details left (60%), Map right (40%) - stacked on mobile */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:min-h-[180px]">
                {/* LEFT COLUMN - Travel details (60% on desktop, full on mobile) */}
                <div className="w-full md:w-[60%] min-w-0 flex flex-col justify-between">
                  {/* Top: Route & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2 md:gap-3 mb-2 md:mb-3">
                      <div>
                        <div className="font-semibold text-blue-100 text-base md:text-lg">
                          {item.route}
                        </div>
                        {item.flight && (
                          <div className="text-xs md:text-sm text-blue-400 mt-1">
                            {item.airline} {item.flight}
                            {item.aircraft && <span className="text-blue-500"> • {item.aircraft}</span>}
                          </div>
                        )}
                      </div>
                      {item.status && <StatusPill code={item.status} />}
                    </div>
                  </div>

                  {/* Bottom: Flight details in a row */}
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-blue-300">
                    {item.time && (
                      <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50">
                        <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                        <span>{item.time}</span>
                      </div>
                    )}
                    {item.duration && (
                      <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50">
                        <Timer className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                        <span>{item.duration}</span>
                      </div>
                    )}
                    {item.cabinClass && (
                      <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50">
                        <Armchair className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                        <span>{item.cabinClass}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN - Route map (40% on desktop, hidden on mobile) */}
                {item.departureAirport && item.arrivalAirport && (
                  <div className="hidden md:block w-[40%] flex-shrink-0">
                    <TravelRouteMap
                      departureAirport={item.departureAirport}
                      arrivalAirport={item.arrivalAirport}
                      route={item.route}
                      type={item.type}
                    />
                  </div>
                )}
              </div>

              {/* Airport details row */}
              {(item.departureAirport || item.arrivalAirport) && (
                <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-blue-900/30">
                  {item.departureAirport && (
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-blue-300">
                      <Plane className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400 rotate-[-45deg]" />
                      <span className="text-blue-400 font-medium">From:</span>
                      <span className="truncate">{item.departureAirport}</span>
                    </div>
                  )}
                  {item.arrivalAirport && (
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-blue-300">
                      <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                      <span className="text-blue-400 font-medium">To:</span>
                      <span className="truncate">{item.arrivalAirport}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Backup plan */}
              {showBackupPlans && item.backupPlan && (
                <BackupPlanAccordion backupPlan={item.backupPlan} />
              )}
            </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function BackupPlanAccordion({ backupPlan }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-blue-900/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        🚨 Backup Plan: {backupPlan.trigger}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-5">
          {backupPlan.options.map((option, idx) => (
            <div
              key={option.id}
              className={classNames(
                "text-xs rounded p-2",
                option.priority === 1 && "bg-green-950/40 border border-green-900/50",
                option.priority === 2 && "bg-amber-950/40 border border-amber-900/50",
                option.priority === 3 && "bg-red-950/40 border border-red-900/50"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="font-medium text-zinc-100">
                    P{option.priority}: {option.title}
                  </div>
                  <div className="text-zinc-400 mt-0.5">
                    {option.description}
                  </div>
                  {option.contact && (
                    <div className="text-zinc-500 mt-0.5 italic">
                      Contact: {option.contact}
                    </div>
                  )}
                </div>
                <StatusPill code={option.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
