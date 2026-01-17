import { useState } from 'react';
import { Upload, Database, CheckCircle2, Loader2, AlertCircle, Plane, MapPin, Calendar } from 'lucide-react';
import { classNames } from '../utils/classNames';

/**
 * Setup Wizard Modal - Shown on first launch to import JSON data to IndexedDB
 */
export function SetupWizard({ onComplete, onImport }) {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Importing, 3: Complete
  const [error, setError] = useState(null);
  const [importStats, setImportStats] = useState(null);

  const handleStartImport = async () => {
    setStep(2);
    setError(null);
    
    try {
      const stats = await onImport();
      setImportStats(stats);
      setStep(3);
    } catch (err) {
      setError(err.message);
      setStep(1);
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
                {step === 1 && <Database className="h-8 w-8 text-white" />}
                {step === 2 && <Loader2 className="h-8 w-8 text-white animate-spin" />}
                {step === 3 && <CheckCircle2 className="h-8 w-8 text-white" />}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {step === 1 && "Welcome! 🎉"}
              {step === 2 && "Setting Up..."}
              {step === 3 && "All Set! ✨"}
            </h2>
            <p className="text-white/80 text-sm">
              {step === 1 && "Let's get your travel itinerary ready"}
              {step === 2 && "Importing your trip data"}
              {step === 3 && "Your itinerary is ready to go"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-zinc-300 text-sm leading-relaxed">
                This app stores your travel itinerary locally in your browser for fast access and offline viewing.
              </p>
              
              <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                    <Database className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Local Storage</div>
                    <div className="text-xs text-zinc-400">Data stays on your device</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Custom Activities</div>
                    <div className="text-xs text-zinc-400">Add your own plans anytime</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
                    <Plane className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Offline Ready</div>
                    <div className="text-xs text-zinc-400">Access your trip without internet</div>
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
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <Upload className="h-4 w-4" />
                Set Up My Itinerary
              </button>
              
              <p className="text-xs text-zinc-500 text-center">
                This only takes a moment
              </p>
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
        <div className="px-6 pb-4">
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
        </div>
      </div>
    </div>
  );
}
