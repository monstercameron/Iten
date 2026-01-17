import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plane } from "lucide-react";
import { StatusPill } from "../StatusPill";
import { TravelRouteMap } from "../TravelRouteMap";
import { classNames } from "../../utils/classNames";

export function TravelSection({ items, isExpanded, onToggle, showBackupPlans }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border border-blue-900/50 rounded-lg overflow-hidden bg-blue-950/20">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 hover:bg-blue-900/20 transition flex items-center justify-between bg-blue-900/30"
      >
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-200">
            ✈️ Travel <span className="text-blue-500">({items.length})</span>
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-blue-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-blue-400" />
        )}
      </button>

      {isExpanded && (
        <div className="divide-y divide-blue-900/30 bg-blue-950/10 slide-down">
          {items.map((item) => (
            <div key={item.id} className="px-3 py-3">
              {/* Split layout: Details on left, Map on right */}
              <div className="flex gap-4">
                {/* Left side - Travel details */}
                <div className="flex-1 min-w-0">
                  {/* Travel item header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-medium text-blue-100 text-sm">
                        {item.route}
                      </div>
                      {item.flight && (
                        <div className="text-xs text-blue-400 mt-0.5">
                          {item.airline} {item.flight}
                          {item.aircraft && <span> • {item.aircraft}</span>}
                        </div>
                      )}
                    </div>
                    {item.status && <StatusPill code={item.status} />}
                  </div>

                  {/* Flight details grid */}
                  <div className="flex flex-col gap-1 text-xs text-blue-300">
                    {item.time && <div>⏰ {item.time}</div>}
                    {item.duration && <div>⌛ {item.duration}</div>}
                    {item.departureAirport && (
                      <div className="truncate">✈️ {item.departureAirport}</div>
                    )}
                    {item.arrivalAirport && (
                      <div className="truncate">📍 {item.arrivalAirport}</div>
                    )}
                    {item.cabinClass && (
                      <div>💺 {item.cabinClass}</div>
                    )}
                  </div>
                </div>

                {/* Right side - Route map */}
                {item.departureAirport && item.arrivalAirport && (
                  <div className="w-1/2 flex-shrink-0">
                    <TravelRouteMap
                      departureAirport={item.departureAirport}
                      arrivalAirport={item.arrivalAirport}
                      route={item.route}
                      type={item.type}
                    />
                  </div>
                )}
              </div>

              {/* Backup plan */}
              {showBackupPlans && item.backupPlan && (
                <BackupPlanAccordion backupPlan={item.backupPlan} />
              )}
            </div>
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
