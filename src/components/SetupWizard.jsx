import { useState, useRef } from 'react';
import { Upload, Database, CheckCircle2, Loader2, AlertCircle, Plane, MapPin, Calendar, FileJson, FileUp, Trash2, X } from 'lucide-react';
import { classNames } from '../utils/classNames';

/**
 * Confirmation Dialog for Reset
 */
function ResetConfirmDialog({ isOpen, onConfirm, onCancel, isResetting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-3 bg-red-500/20 rounded-full">
              <Trash2 className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Reset All Data?</h3>
            <p className="text-zinc-400 text-sm">
              This will permanently delete all your itinerary data from this browser. 
              You'll need to upload your JSON file again.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isResetting}
              className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isResetting}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Reset
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Setup Wizard Modal - Shown on first launch to upload and import JSON data to IndexedDB
 */
export function SetupWizard({ onComplete, onImportJson, onReset }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Importing, 3: Complete
  const [error, setError] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef(null);

  // Validate JSON structure
  const validateJson = (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON structure');
    }
    if (!data.trips || !Array.isArray(data.trips)) {
      throw new Error('JSON must contain a "trips" array');
    }
    return true;
  };

  // Handle file selection
  const handleFile = async (file) => {
    setError(null);
    
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      validateJson(data);
      setJsonData(data);
      setFileName(file.name);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your file.');
      } else {
        setError(err.message);
      }
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Start import
  const handleStartImport = async () => {
    if (!jsonData) {
      setError('Please upload a JSON file first');
      return;
    }

    setStep(2);
    setError(null);
    
    try {
      const stats = await onImportJson(jsonData);
      setImportStats(stats);
      setStep(3);
    } catch (err) {
      setError(err.message);
      setStep(1);
    }
  };

  // Handle reset confirmation
  const handleResetConfirm = async () => {
    if (!onReset) return;
    
    setIsResetting(true);
    try {
      await onReset();
      // Reset wizard state
      setStep(1);
      setJsonData(null);
      setFileName(null);
      setImportStats(null);
      setError(null);
      setShowResetConfirm(false);
    } catch (err) {
      setError('Failed to reset: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header with animation */}
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-6 text-center overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse delay-300" />
            <Plane className="absolute top-4 right-8 h-6 w-6 text-white/20 animate-bounce" />
            <MapPin className="absolute bottom-4 left-8 h-5 w-5 text-white/20 animate-bounce delay-150" />
          </div>
          
          <div className="relative">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                {step === 1 && <Upload className="h-8 w-8 text-white" />}
                {step === 2 && <Loader2 className="h-8 w-8 text-white animate-spin" />}
                {step === 3 && <CheckCircle2 className="h-8 w-8 text-white" />}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {step === 1 && "Upload Itinerary 📁"}
              {step === 2 && "Setting Up..."}
              {step === 3 && "All Set! ✨"}
            </h2>
            <p className="text-white/80 text-sm">
              {step === 1 && "Import your travel itinerary JSON file"}
              {step === 2 && "Importing your trip data"}
              {step === 3 && "Your itinerary is ready to go"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Upload your travel itinerary JSON file to get started. Your data stays private and is stored only in your browser.
              </p>
              
              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={classNames(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                  isDragging 
                    ? "border-blue-500 bg-blue-500/10" 
                    : jsonData 
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {jsonData ? (
                  <div className="space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full">
                      <FileJson className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-medium">{fileName}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {jsonData.trips?.length || 0} trips found • Click to change
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-full">
                      <FileUp className="h-6 w-6 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-zinc-300 font-medium">Drop your JSON file here</p>
                      <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                    <Database className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Private & Local</div>
                    <div className="text-xs text-zinc-400">Data never leaves your device</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Add Activities</div>
                    <div className="text-xs text-zinc-400">Customize your plans anytime</div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              <button
                onClick={handleStartImport}
                disabled={!jsonData}
                className={classNames(
                  "w-full py-3 px-4 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                  jsonData
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                <Upload className="h-4 w-4" />
                Import Itinerary
              </button>
            </div>
          )}

          {/* Step 2: Importing */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                  <Database className="absolute inset-0 m-auto h-6 w-6 text-zinc-400" />
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <p className="text-zinc-300 text-sm">Importing your trip data...</p>
                <p className="text-zinc-500 text-xs">Setting up local database</p>
              </div>
              
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-zinc-300 text-sm">
                  Your itinerary has been set up successfully!
                </p>
              </div>

              {importStats && (
                <div className="bg-zinc-800/50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{importStats.trips || 0}</div>
                    <div className="text-xs text-zinc-500">Trips</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{importStats.segments || 0}</div>
                    <div className="text-xs text-zinc-500">Segments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{importStats.days || 0}</div>
                    <div className="text-xs text-zinc-500">Days</div>
                  </div>
                </div>
              )}

              <button
                onClick={onComplete}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Plane className="h-4 w-4" />
                Start Exploring
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 space-y-3">
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={classNames(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  step >= s ? "bg-blue-500 w-4" : "bg-zinc-700"
                )}
              />
            ))}
          </div>
          
          {/* Reset button - only show if onReset is provided */}
          {onReset && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 px-3 text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              Reset All Data
            </button>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ResetConfirmDialog
        isOpen={showResetConfirm}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        isResetting={isResetting}
      />
    </div>
  );
}
