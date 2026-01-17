/**
 * @fileoverview Add/Edit Activity Modal component.
 * 
 * Provides a form modal for:
 * - Creating new manual activities
 * - Editing existing manual activities
 * 
 * Features:
 * - Category selection with auto-icon update
 * - Time range input
 * - Cost tracking with currency selection
 * - Priority levels
 * - Notes/tips field
 * 
 * @module components/AddActivityModal
 */

import { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Available activity categories with their associated icons.
 * @constant {Array<{value: string, icon: string}>}
 */
const ACTIVITY_CATEGORY_OPTIONS = [
  { value: 'Food', icon: '🍜' },
  { value: 'Shopping', icon: '🛍️' },
  { value: 'Sightseeing', icon: '📸' },
  { value: 'Entertainment', icon: '🎮' },
  { value: 'Cultural', icon: '⛩️' },
  { value: 'Personal', icon: '👤' },
  { value: 'Transport', icon: '🚃' },
  { value: 'Outdoor', icon: '🏔️' },
  { value: 'Nightlife', icon: '🌃' },
  { value: 'Relaxation', icon: '♨️' }
];

/**
 * Available priority levels for activities.
 * @constant {Array<string>}
 */
const ACTIVITY_PRIORITY_OPTIONS = ['high', 'medium', 'low'];

/**
 * Available currency options for cost estimation.
 * @constant {Array<string>}
 */
const COST_CURRENCY_OPTIONS = ['USD', 'PHP', 'JPY'];

/**
 * Default form data for a new activity.
 * @constant {Object}
 */
const DEFAULT_ACTIVITY_FORM_DATA = {
  name: '',
  timeStart: '',
  timeEnd: '',
  location: '',
  category: 'Sightseeing',
  icon: '📸',
  priority: 'medium',
  notes: '',
  estimatedCost: '',
  currency: 'JPY'
};

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Finds the icon for a given category.
 * @pure
 * @param {string} categoryValue - The category value to look up
 * @returns {string|null} The icon emoji or null if not found
 */
function findIconForCategory(categoryValue) {
  const matchingCategory = ACTIVITY_CATEGORY_OPTIONS.find(
    category => category.value === categoryValue
  );
  return matchingCategory?.icon || null;
}

/**
 * Formats a time range string from start and end times.
 * @pure
 * @param {string} startTime - The start time
 * @param {string} endTime - The end time
 * @returns {string} Formatted time range or empty string
 */
function formatTimeRangeString(startTime, endTime) {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }
  return startTime || '';
}

/**
 * Generates a unique ID for a new manual activity.
 * @returns {string} A unique activity ID with 'manual-' prefix
 */
function generateManualActivityId() {
  return `manual-${Date.now()}`;
}

/**
 * Converts form data to an activity object.
 * @pure
 * @param {Object} formData - The form data
 * @param {string|null} existingId - ID for edit mode, null for new activity
 * @returns {Object} The activity object
 */
function buildActivityFromFormData(formData, existingId) {
  return {
    id: existingId || generateManualActivityId(),
    name: formData.name,
    timeStart: formData.timeStart,
    timeEnd: formData.timeEnd,
    location: formData.location,
    category: formData.category,
    icon: formData.icon,
    priority: formData.priority,
    notes: formData.notes,
    estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
    currency: formData.currency,
    time: formatTimeRangeString(formData.timeStart, formData.timeEnd)
  };
}

/**
 * Converts an existing activity to form data format.
 * @pure
 * @param {Object} activity - The activity to convert
 * @returns {Object} Form data compatible object
 */
function convertActivityToFormData(activity) {
  return {
    name: activity.name || '',
    timeStart: activity.timeStart || '',
    timeEnd: activity.timeEnd || '',
    location: activity.location || '',
    category: activity.category || 'Sightseeing',
    icon: activity.icon || '📸',
    priority: activity.priority || 'medium',
    notes: activity.notes || '',
    estimatedCost: activity.estimatedCost ? String(activity.estimatedCost) : '',
    currency: activity.currency || 'JPY'
  };
}

/**
 * Capitalizes the first letter of a string.
 * @pure
 * @param {string} text - The text to capitalize
 * @returns {string} Text with first letter capitalized
 */
function capitalizeFirstLetter(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * @typedef {Object} AddActivityModalProps
 * @property {boolean} isOpen - Whether the modal is visible
 * @property {Function} onClose - Callback to close the modal
 * @property {Function} onAdd - Callback to add a new activity
 * @property {Function} onUpdate - Callback to update an existing activity
 * @property {string} date - The date key for the activity (YYYY-MM-DD)
 * @property {Object|null} editingActivity - Activity to edit, null for new activity
 */

/**
 * Add/Edit Activity Modal component.
 * 
 * Provides a form for creating or editing manual activities with:
 * - Name, location, and time fields
 * - Category selection with automatic icon updates
 * - Priority level selection
 * - Cost estimation with currency
 * - Notes field
 * 
 * @param {AddActivityModalProps} props - Component properties
 * @returns {JSX.Element|null} The modal component or null if closed
 */
export default function AddActivityModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate, 
  date, 
  editingActivity = null 
}) {
  // ============================================================================
  // STATE
  // ============================================================================
  
  /** @type {[Object, Function]} Current form data state */
  const [activityFormData, setActivityFormData] = useState(DEFAULT_ACTIVITY_FORM_DATA);

  // Determine if we're in edit mode
  const isInEditMode = !!editingActivity;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Populate form when editing an existing activity, or reset for new activity.
   */
  useEffect(() => {
    if (editingActivity) {
      // CRITICAL PATH: Convert existing activity to form data format
      setActivityFormData(convertActivityToFormData(editingActivity));
    } else {
      // Reset to default for new activity
      setActivityFormData(DEFAULT_ACTIVITY_FORM_DATA);
    }
  }, [editingActivity, isOpen]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles form field changes with auto-icon update for category.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>} changeEvent - The change event
   */
  const handleFormFieldChange = (changeEvent) => {
    const { name: fieldName, value: fieldValue } = changeEvent.target;
    
    setActivityFormData(previousFormData => {
      const updatedFormData = { ...previousFormData, [fieldName]: fieldValue };
      
      // CRITICAL PATH: Auto-update icon when category changes
      if (fieldName === 'category') {
        const categoryIcon = findIconForCategory(fieldValue);
        if (categoryIcon) {
          updatedFormData.icon = categoryIcon;
        }
      }
      
      return updatedFormData;
    });
  };

  /**
   * Handles form submission for add/edit.
   * @param {React.FormEvent} submitEvent - The form submission event
   */
  const handleFormSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    
    // Build the activity object from form data
    const activityObject = buildActivityFromFormData(
      activityFormData,
      isInEditMode ? editingActivity.id : null
    );
    
    // CRITICAL PATH: Call appropriate callback based on mode
    if (isInEditMode && onUpdate) {
      onUpdate(activityObject, date);
    } else {
      onAdd(activityObject, date);
    }
    
    // Reset form to defaults
    setActivityFormData(DEFAULT_ACTIVITY_FORM_DATA);
    
    onClose();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Early return if modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[3000] p-2 md:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        {/* ================================================================
            MODAL HEADER
            ================================================================ */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            {isInEditMode ? (
              <>
                <Save size={18} className="text-amber-400" />
                Edit Activity
              </>
            ) : (
              <>
                <Plus size={18} className="text-blue-400" />
                Add Activity
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* ================================================================
            FORM
            ================================================================ */}
        <form onSubmit={handleFormSubmit} className="p-3 md:p-4 space-y-3 md:space-y-4">
          {/* Activity Name Field */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              name="name"
              value={activityFormData.name}
              onChange={handleFormFieldChange}
              required
              placeholder="e.g., Visit Senso-ji Temple"
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Time Range Row */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Start Time
              </label>
              <input
                type="text"
                name="timeStart"
                value={activityFormData.timeStart}
                onChange={handleFormFieldChange}
                placeholder="9:00 AM"
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                End Time
              </label>
              <input
                type="text"
                name="timeEnd"
                value={activityFormData.timeEnd}
                onChange={handleFormFieldChange}
                placeholder="11:00 AM"
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location Field */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={activityFormData.location}
              onChange={handleFormFieldChange}
              placeholder="e.g., Asakusa, Tokyo"
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Category
              </label>
              <select
                name="category"
                value={activityFormData.category}
                onChange={handleFormFieldChange}
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {ACTIVITY_CATEGORY_OPTIONS.map(categoryOption => (
                  <option key={categoryOption.value} value={categoryOption.value}>
                    {categoryOption.icon} {categoryOption.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={activityFormData.priority}
                onChange={handleFormFieldChange}
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {ACTIVITY_PRIORITY_OPTIONS.map(priorityOption => (
                  <option key={priorityOption} value={priorityOption}>
                    {capitalizeFirstLetter(priorityOption)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Icon Field */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Icon (emoji)
            </label>
            <input
              type="text"
              name="icon"
              value={activityFormData.icon}
              onChange={handleFormFieldChange}
              placeholder="📸"
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Cost & Currency Row */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Estimated Cost
              </label>
              <input
                type="number"
                name="estimatedCost"
                value={activityFormData.estimatedCost}
                onChange={handleFormFieldChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={activityFormData.currency}
                onChange={handleFormFieldChange}
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {COST_CURRENCY_OPTIONS.map(currencyOption => (
                  <option key={currencyOption} value={currencyOption}>{currencyOption}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Notes / Tips
            </label>
            <textarea
              name="notes"
              value={activityFormData.notes}
              onChange={handleFormFieldChange}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-2 md:py-2.5 text-sm md:text-base ${isInEditMode ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            {isInEditMode ? (
              <>
                <Save size={16} />
                Save Changes
              </>
            ) : (
              <>
                <Plus size={16} />
                Add Activity
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
