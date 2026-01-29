/**
 * @fileoverview Component for displaying a saved boarding pass
 * 
 * Renders boarding pass data in a styled card format with
 * key flight information and delete functionality.
 */

import React, { useState, useCallback } from "react";
import { Trash2, Ticket, User, MapPin, Clock, Hash, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Extracts common boarding pass fields from JSON data
 * Handles various JSON structures by checking multiple possible field names
 * 
 * @pure
 * @param {Object} data - The raw boarding pass JSON data
 * @returns {Object} Normalized boarding pass fields
 */
function extractBoardingPassFields(data) {
  return {
    // Passenger name - check common field variations
    passenger: data.passenger || data.passengerName || data.name || data.pax || null,
    
    // Seat assignment
    seat: data.seat || data.seatNumber || data.seatAssignment || null,
    
    // Gate
    gate: data.gate || data.gateNumber || data.boardingGate || null,
    
    // Boarding time
    boardingTime: data.boardingTime || data.boarding || data.boardTime || null,
    
    // Boarding group/zone
    boardingGroup: data.boardingGroup || data.group || data.zone || data.boardingZone || null,
    
    // Flight number
    flight: data.flight || data.flightNumber || data.flightNo || null,
    
    // Confirmation/PNR
    confirmation: data.confirmation || data.pnr || data.confirmationCode || data.recordLocator || null,
    
    // Sequence number
    sequence: data.sequence || data.sequenceNumber || data.seqNo || null
  };
}

/**
 * Boarding pass display card component
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.boardingPass - The boarding pass data object
 * @param {Function} props.onDelete - Callback to delete the boarding pass (boardingPassId) => Promise
 * @param {string} props.segmentId - The segment ID this pass belongs to
 */
export function BoardingPassCard({ boardingPass, onDelete, segmentId }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const fields = extractBoardingPassFields(boardingPass);
  const hasAnyField = Object.values(fields).some(v => v !== null);

  /**
   * Handles delete button click
   */
  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this boarding pass?')) return;
    
    setIsDeleting(true);
    await onDelete(segmentId, boardingPass.id);
    setIsDeleting(false);
  }, [onDelete, segmentId, boardingPass.id]);

  /**
   * Toggles raw JSON data view
   */
  const toggleRawData = useCallback(() => {
    setShowRawData(prev => !prev);
  }, []);

  return (
    <div className="mt-3 rounded-lg bg-gradient-to-br from-amber-950/30 via-orange-950/20 to-yellow-950/30 border border-amber-700/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-amber-900/30 border-b border-amber-700/30">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-200">Boarding Pass</span>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 rounded hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
          title="Delete boarding pass"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {hasAnyField ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Passenger */}
            {fields.passenger && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Passenger</div>
                  <div className="text-sm text-zinc-200 font-medium">{fields.passenger}</div>
                </div>
              </div>
            )}

            {/* Seat */}
            {fields.seat && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Seat</div>
                  <div className="text-sm text-zinc-200 font-medium">{fields.seat}</div>
                </div>
              </div>
            )}

            {/* Gate */}
            {fields.gate && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Gate</div>
                  <div className="text-sm text-zinc-200 font-medium">{fields.gate}</div>
                </div>
              </div>
            )}

            {/* Boarding Time */}
            {fields.boardingTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Boarding</div>
                  <div className="text-sm text-zinc-200 font-medium">{fields.boardingTime}</div>
                </div>
              </div>
            )}

            {/* Boarding Group */}
            {fields.boardingGroup && (
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Group</div>
                  <div className="text-sm text-zinc-200 font-medium">{fields.boardingGroup}</div>
                </div>
              </div>
            )}

            {/* Confirmation */}
            {fields.confirmation && (
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">PNR</div>
                  <div className="text-sm text-zinc-200 font-mono">{fields.confirmation}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">
            Boarding pass data stored (custom format)
          </p>
        )}

        {/* Raw JSON Toggle */}
        <button
          onClick={toggleRawData}
          className="flex items-center gap-1 mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showRawData ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showRawData ? 'Hide' : 'Show'} raw data
        </button>

        {/* Raw JSON Display */}
        {showRawData && (
          <pre className="mt-2 p-2 bg-zinc-900/50 rounded text-xs text-zinc-400 overflow-x-auto max-h-40">
            {JSON.stringify(boardingPass, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
