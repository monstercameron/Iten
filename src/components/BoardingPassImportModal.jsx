/**
 * @fileoverview Modal component for importing boarding pass JSON data
 * 
 * Allows users to paste boarding pass JSON and save it to IndexedDB
 * linked to a specific flight segment.
 */

import React, { useState, useCallback } from "react";
import { X, Upload, AlertCircle, CheckCircle } from "lucide-react";

/**
 * Modal for importing boarding pass JSON data
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onSave - Callback to save boarding pass (segmentId, data) => Promise
 * @param {string} props.segmentId - The flight segment ID to link the boarding pass to
 * @param {string} props.flightInfo - Display string for the flight (e.g., "UA249 FLL → SFO")
 */
export function BoardingPassImportModal({ isOpen, onClose, onSave, segmentId, flightInfo }) {
  const [jsonInput, setJsonInput] = useState('');
  const [parseError, setParseError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /**
   * Handles JSON input change and validates it
   */
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setJsonInput(value);
    setParseError(null);
    setSaveSuccess(false);

    // Try to parse for validation feedback
    if (value.trim()) {
      try {
        JSON.parse(value);
      } catch (err) {
        setParseError('Invalid JSON format');
      }
    }
  }, []);

  /**
   * Handles save button click
   */
  const handleSave = useCallback(async () => {
    if (!jsonInput.trim()) {
      setParseError('Please enter boarding pass JSON');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonInput);
    } catch (err) {
      setParseError('Invalid JSON format');
      return;
    }

    setIsSaving(true);
    setParseError(null);

    const [, error] = await onSave(segmentId, parsedData);
    
    setIsSaving(false);
    
    if (error) {
      setParseError(`Failed to save: ${error.message}`);
      return;
    }

    setSaveSuccess(true);
    
    // Close modal after brief success message
    setTimeout(() => {
      setJsonInput('');
      setSaveSuccess(false);
      onClose();
    }, 1000);
  }, [jsonInput, onSave, segmentId, onClose]);

  /**
   * Handles modal close
   */
  const handleClose = useCallback(() => {
    setJsonInput('');
    setParseError(null);
    setSaveSuccess(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const isValidJson = jsonInput.trim() && !parseError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              🎫 Import Boarding Pass
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {flightInfo}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Paste your boarding pass JSON
          </label>
          
          <textarea
            value={jsonInput}
            onChange={handleInputChange}
            placeholder='{"passenger": "CAMERON/EARL", "seat": "24A", "gate": "B12", ...}'
            className="w-full h-48 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />

          {/* Status Messages */}
          {parseError && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{parseError}</span>
            </div>
          )}
          
          {isValidJson && !saveSuccess && (
            <div className="flex items-center gap-2 mt-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Valid JSON</span>
            </div>
          )}
          
          {saveSuccess && (
            <div className="flex items-center gap-2 mt-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Boarding pass saved!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValidJson || isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Boarding Pass'}
          </button>
        </div>
      </div>
    </div>
  );
}
