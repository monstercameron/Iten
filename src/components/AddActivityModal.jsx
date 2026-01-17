import { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';

const CATEGORY_OPTIONS = [
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

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];

const CURRENCY_OPTIONS = ['USD', 'PHP', 'JPY'];

const defaultFormData = {
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

export default function AddActivityModal({ isOpen, onClose, onAdd, onUpdate, date, editingActivity = null }) {
  const [formData, setFormData] = useState(defaultFormData);

  const isEditMode = !!editingActivity;

  // Populate form when editing
  useEffect(() => {
    if (editingActivity) {
      setFormData({
        name: editingActivity.name || '',
        timeStart: editingActivity.timeStart || '',
        timeEnd: editingActivity.timeEnd || '',
        location: editingActivity.location || '',
        category: editingActivity.category || 'Sightseeing',
        icon: editingActivity.icon || '📸',
        priority: editingActivity.priority || 'medium',
        notes: editingActivity.notes || '',
        estimatedCost: editingActivity.estimatedCost ? String(editingActivity.estimatedCost) : '',
        currency: editingActivity.currency || 'JPY'
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [editingActivity, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-update icon when category changes
      if (name === 'category') {
        const cat = CATEGORY_OPTIONS.find(c => c.value === value);
        if (cat) updated.icon = cat.icon;
      }
      
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const activity = {
      id: isEditMode ? editingActivity.id : `manual-${Date.now()}`,
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
      time: formData.timeStart && formData.timeEnd 
        ? `${formData.timeStart} - ${formData.timeEnd}` 
        : formData.timeStart || ''
    };
    
    if (isEditMode && onUpdate) {
      onUpdate(activity, date);
    } else {
      onAdd(activity, date);
    }
    
    // Reset form
    setFormData(defaultFormData);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[3000] p-2 md:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            {isEditMode ? (
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 md:p-4 space-y-3 md:space-y-4">
          {/* Activity Name */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Visit Senso-ji Temple"
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Time Row */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Start Time
              </label>
              <input
                type="text"
                name="timeStart"
                value={formData.timeStart}
                onChange={handleChange}
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
                value={formData.timeEnd}
                onChange={handleChange}
                placeholder="11:00 AM"
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
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
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.value}
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
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Icon */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Icon (emoji)
            </label>
            <input
              type="text"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              placeholder="📸"
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Cost Row */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
                Estimated Cost
              </label>
              <input
                type="number"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleChange}
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
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-300 mb-1">
              Notes / Tips
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-3 py-2 text-sm md:text-base bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-2 md:py-2.5 text-sm md:text-base ${isEditMode ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            {isEditMode ? (
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
