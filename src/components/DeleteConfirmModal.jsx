/**
 * @fileoverview Delete Confirmation Modal component.
 * 
 * Provides a confirmation dialog before deleting an activity.
 * Displays the activity name and requires explicit confirmation.
 * 
 * @module components/DeleteConfirmModal
 */

import { X, Trash2, AlertTriangle } from 'lucide-react';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * @typedef {Object} DeleteConfirmModalProps
 * @property {boolean} isOpen - Whether the modal is visible
 * @property {Function} onClose - Callback to close the modal
 * @property {Function} onConfirm - Callback when deletion is confirmed
 * @property {string} activityName - Name of the activity being deleted
 */

/**
 * Delete Confirmation Modal component.
 * 
 * Displays a confirmation dialog with:
 * - Warning icon and header
 * - Activity name display
 * - Warning about irreversible action
 * - Cancel and Delete buttons
 * 
 * @param {DeleteConfirmModalProps} props - Component properties
 * @returns {JSX.Element|null} The modal component or null if closed
 */
export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  activityName 
}) {
  // CRITICAL PATH: Early return if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[4000] p-3 md:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm">
        {/* ================================================================
            MODAL HEADER
            ================================================================ */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-zinc-700">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            Delete Activity
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* ================================================================
            CONTENT - Warning message and activity name
            ================================================================ */}
        <div className="p-3 md:p-4">
          <p className="text-sm md:text-base text-zinc-300 mb-2">
            Are you sure you want to delete this activity?
          </p>
          <p className="text-sm md:text-base text-white font-medium bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700 truncate">
            {activityName}
          </p>
          <p className="text-xs md:text-sm text-zinc-500 mt-3">
            This action cannot be undone.
          </p>
        </div>

        {/* ================================================================
            ACTION BUTTONS
            ================================================================ */}
        <div className="flex gap-2 md:gap-3 p-3 md:p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="flex-1 py-2 md:py-2.5 text-sm md:text-base bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 md:py-2.5 text-sm md:text-base bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
