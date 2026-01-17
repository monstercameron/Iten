/**
 * @fileoverview Setup Wizard component for first-time itinerary import.
 * 
 * Provides a multi-step modal wizard that guides users through:
 * 1. Uploading a JSON itinerary file (drag-drop or file picker)
 * 2. Importing and validating the data into IndexedDB
 * 3. Displaying import statistics and completion status
 * 
 * Also includes data reset functionality with confirmation dialog.
 * 
 * @module components/SetupWizard
 */

import { useState, useRef } from 'react';
import { Upload, Database, CheckCircle2, Loader2, AlertCircle, Plane, MapPin, Calendar, FileJson, FileUp, Trash2 } from 'lucide-react';
import { classNames } from '../utils/classNames';

// ============================================================================
// CONSTANTS
// ============================================================================

/** @constant {number} WIZARD_STEP_UPLOAD - First step: file upload */
const WIZARD_STEP_UPLOAD = 1;

/** @constant {number} WIZARD_STEP_IMPORTING - Second step: data import in progress */
const WIZARD_STEP_IMPORTING = 2;

/** @constant {number} WIZARD_STEP_COMPLETE - Third step: import complete */
const WIZARD_STEP_COMPLETE = 3;

/** @constant {string} ACCEPTED_FILE_EXTENSION - Required file extension for upload */
const ACCEPTED_FILE_EXTENSION = '.json';

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that the uploaded JSON has the required itinerary structure.
 * @pure
 * @param {unknown} jsonData - The parsed JSON data to validate
 * @returns {[boolean, null] | [null, Error]} Go-style result tuple
 */
function validateItineraryJsonStructure(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    return [null, new Error('Invalid JSON structure')];
  }
  if (!jsonData.trips || !Array.isArray(jsonData.trips)) {
    return [null, new Error('JSON must contain a "trips" array')];
  }
  return [true, null];
}

/**
 * Checks if a filename has the correct JSON extension.
 * @pure
 * @param {string} fileName - The name of the file to check
 * @returns {boolean} True if the file has a .json extension
 */
function hasValidJsonExtension(fileName) {
  return fileName?.endsWith(ACCEPTED_FILE_EXTENSION) ?? false;
}

/**
 * Extracts the trip count from parsed JSON data.
 * @pure
 * @param {Object|null} jsonData - The parsed itinerary data
 * @returns {number} The number of trips found, or 0 if none
 */
function extractTripCountFromJson(jsonData) {
  return jsonData?.trips?.length ?? 0;
}

/**
 * Determines the appropriate CSS classes for the file drop zone.
 * @pure
 * @param {boolean} isDraggingOver - Whether a file is being dragged over the zone
 * @param {boolean} hasFileSelected - Whether a file has already been selected
 * @returns {string} The combined CSS class string
 */
function getDropZoneClassNames(isDraggingOver, hasFileSelected) {
  const baseClasses = "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all";
  
  if (isDraggingOver) {
    return classNames(baseClasses, "border-blue-500 bg-blue-500/10");
  }
  if (hasFileSelected) {
    return classNames(baseClasses, "border-emerald-500 bg-emerald-500/10");
  }
  return classNames(baseClasses, "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50");
}

/**
 * Gets the appropriate icon component for the current wizard step.
 * @pure
 * @param {number} currentStep - The current wizard step number
 * @returns {JSX.Element} The icon component to display
 */
function getStepIconComponent(currentStep) {
  switch (currentStep) {
    case WIZARD_STEP_UPLOAD:
      return <Upload className="h-8 w-8 text-white" />;
    case WIZARD_STEP_IMPORTING:
      return <Loader2 className="h-8 w-8 text-white animate-spin" />;
    case WIZARD_STEP_COMPLETE:
      return <CheckCircle2 className="h-8 w-8 text-white" />;
    default:
      return <Upload className="h-8 w-8 text-white" />;
  }
}

/**
 * Gets the header title text for the current wizard step.
 * @pure
 * @param {number} currentStep - The current wizard step number
 * @returns {string} The title text to display
 */
function getStepTitleText(currentStep) {
  switch (currentStep) {
    case WIZARD_STEP_UPLOAD:
      return "Upload Itinerary 📁";
    case WIZARD_STEP_IMPORTING:
      return "Setting Up...";
    case WIZARD_STEP_COMPLETE:
      return "All Set! ✨";
    default:
      return "Upload Itinerary 📁";
  }
}

/**
 * Gets the header subtitle text for the current wizard step.
 * @pure
 * @param {number} currentStep - The current wizard step number
 * @returns {string} The subtitle text to display
 */
function getStepSubtitleText(currentStep) {
  switch (currentStep) {
    case WIZARD_STEP_UPLOAD:
      return "Import your travel itinerary JSON file";
    case WIZARD_STEP_IMPORTING:
      return "Importing your trip data";
    case WIZARD_STEP_COMPLETE:
      return "Your itinerary is ready to go";
    default:
      return "Import your travel itinerary JSON file";
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * @typedef {Object} ResetConfirmDialogProps
 * @property {boolean} isDialogOpen - Whether the dialog is visible
 * @property {Function} onConfirmReset - Callback when user confirms reset
 * @property {Function} onCancelReset - Callback when user cancels
 * @property {boolean} isResetInProgress - Whether reset operation is in progress
 */

/**
 * Confirmation dialog for resetting all itinerary data.
 * Displays a warning message and requires explicit user confirmation.
 * 
 * @param {ResetConfirmDialogProps} props - Component properties
 * @returns {JSX.Element|null} The dialog component or null if not open
 */
function ResetConfirmDialog({ 
  isDialogOpen, 
  onConfirmReset, 
  onCancelReset, 
  isResetInProgress 
}) {
  // CRITICAL PATH: Early return prevents unnecessary rendering
  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Warning Icon */}
          <div className="flex items-center justify-center">
            <div className="p-3 bg-red-500/20 rounded-full">
              <Trash2 className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          {/* Warning Message */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Reset All Data?</h3>
            <p className="text-zinc-400 text-sm">
              This will permanently delete all your itinerary data from this browser. 
              You'll need to upload your JSON file again.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancelReset}
              disabled={isResetInProgress}
              className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmReset}
              disabled={isResetInProgress}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isResetInProgress ? (
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * @typedef {Object} ImportStatistics
 * @property {number} trips - Number of trips imported
 * @property {number} segments - Number of segments imported
 * @property {number} days - Number of days across all trips
 */

/**
 * @typedef {Object} SetupWizardProps
 * @property {Function} onComplete - Callback when setup is finished and user clicks "Start Exploring"
 * @property {Function} onImportJson - Async callback to import JSON data, returns ImportStatistics
 * @property {Function} [onReset] - Optional callback to reset all data
 */

/**
 * Setup Wizard Modal - Multi-step wizard for first-time itinerary import.
 * 
 * Handles the complete flow of:
 * - File selection via drag-drop or file picker
 * - JSON validation and parsing
 * - Import process with loading state
 * - Success display with statistics
 * - Optional data reset functionality
 * 
 * @param {SetupWizardProps} props - Component properties
 * @returns {JSX.Element} The wizard modal component
 */
export function SetupWizard({ onComplete, onImportJson, onReset }) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /** @type {[number, Function]} Current wizard step (1: Upload, 2: Importing, 3: Complete) */
  const [currentWizardStep, setCurrentWizardStep] = useState(WIZARD_STEP_UPLOAD);
  
  /** @type {[string|null, Function]} Error message to display, if any */
  const [errorMessage, setErrorMessage] = useState(null);
  
  /** @type {[ImportStatistics|null, Function]} Statistics from successful import */
  const [importStatistics, setImportStatistics] = useState(null);
  
  /** @type {[Object|null, Function]} Parsed and validated JSON data */
  const [parsedJsonData, setParsedJsonData] = useState(null);
  
  /** @type {[string|null, Function]} Name of the uploaded file */
  const [uploadedFileName, setUploadedFileName] = useState(null);
  
  /** @type {[boolean, Function]} Whether a file is being dragged over the drop zone */
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
  
  /** @type {[boolean, Function]} Whether the reset confirmation dialog is visible */
  const [isResetDialogVisible, setIsResetDialogVisible] = useState(false);
  
  /** @type {[boolean, Function]} Whether a reset operation is in progress */
  const [isResetOperationInProgress, setIsResetOperationInProgress] = useState(false);
  
  /** @type {React.RefObject<HTMLInputElement>} Reference to hidden file input element */
  const fileInputElementRef = useRef(null);

  // ============================================================================
  // FILE HANDLING CALLBACKS
  // ============================================================================

  /**
   * Processes an uploaded file - reads, parses, and validates the JSON.
   * @param {File} uploadedFile - The file object from input or drop event
   * @returns {Promise<void>}
   */
  const processUploadedFile = async (uploadedFile) => {
    // CRITICAL PATH: Clear any previous errors before processing
    setErrorMessage(null);
    
    if (!uploadedFile) return;
    
    // Validate file extension
    if (!hasValidJsonExtension(uploadedFile.name)) {
      setErrorMessage('Please upload a JSON file');
      return;
    }

    // CRITICAL PATH: Read file contents
    const [fileTextContent, readErr] = await uploadedFile.text().then(
      (content) => [content, null],
      (error) => [null, error instanceof Error ? error : new Error(String(error))]
    );
    
    if (readErr) {
      setErrorMessage('Failed to read file');
      return;
    }

    // CRITICAL PATH: Parse JSON with Go-style error handling
    const [parsedData, parseErr] = (() => {
      try {
        return [JSON.parse(fileTextContent), null];
      } catch (e) {
        return [null, e instanceof Error ? e : new Error('Invalid JSON')];
      }
    })();
    
    if (parseErr) {
      setErrorMessage('Invalid JSON format. Please check your file.');
      return;
    }
    
    // Validate the JSON structure
    const [, validateErr] = validateItineraryJsonStructure(parsedData);
    if (validateErr) {
      setErrorMessage(validateErr.message);
      return;
    }
    
    // Store valid data in state
    setParsedJsonData(parsedData);
    setUploadedFileName(uploadedFile.name);
  };

  /**
   * Handles file input change event from the hidden input element.
   * @param {React.ChangeEvent<HTMLInputElement>} changeEvent - The input change event
   */
  const handleFileInputChange = (changeEvent) => {
    const selectedFile = changeEvent.target.files?.[0];
    if (selectedFile) {
      processUploadedFile(selectedFile);
    }
  };

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  /**
   * Handles drag enter event on the drop zone.
   * @param {React.DragEvent} dragEvent - The drag event
   */
  const handleDragEnterOnDropZone = (dragEvent) => {
    dragEvent.preventDefault();
    dragEvent.stopPropagation();
    setIsDraggingFileOver(true);
  };

  /**
   * Handles drag over event to allow dropping.
   * @param {React.DragEvent} dragEvent - The drag event
   */
  const handleDragOverDropZone = (dragEvent) => {
    dragEvent.preventDefault();
    dragEvent.stopPropagation();
  };

  /**
   * Handles drag leave event on the drop zone.
   * Only updates state if actually leaving the drop zone (not entering a child).
   * @param {React.DragEvent} dragEvent - The drag event
   */
  const handleDragLeaveFromDropZone = (dragEvent) => {
    dragEvent.preventDefault();
    dragEvent.stopPropagation();
    // CRITICAL PATH: Only set dragging false if we're leaving the drop zone itself
    // (not when entering a child element within the zone)
    if (dragEvent.currentTarget.contains(dragEvent.relatedTarget)) return;
    setIsDraggingFileOver(false);
  };

  /**
   * Handles file drop event on the drop zone.
   * @param {React.DragEvent} dropEvent - The drop event
   */
  const handleFileDropOnZone = (dropEvent) => {
    dropEvent.preventDefault();
    dropEvent.stopPropagation();
    setIsDraggingFileOver(false);
    
    const droppedFile = dropEvent.dataTransfer.files?.[0];
    if (droppedFile) {
      processUploadedFile(droppedFile);
    }
  };

  // ============================================================================
  // IMPORT AND RESET HANDLERS
  // ============================================================================

  /**
   * Initiates the import process with the uploaded JSON data.
   * Transitions through wizard steps and handles success/failure.
   * @returns {Promise<void>}
   */
  const handleStartImportProcess = async () => {
    if (!parsedJsonData) {
      setErrorMessage('Please upload a JSON file first');
      return;
    }

    // CRITICAL PATH: Transition to importing step
    setCurrentWizardStep(WIZARD_STEP_IMPORTING);
    setErrorMessage(null);
    
    // CRITICAL PATH: Call the import callback and wait for statistics
    const [resultStatistics, importErr] = await onImportJson(parsedJsonData);
    if (importErr) {
      // On failure, return to upload step with error message
      setErrorMessage(importErr.message);
      setCurrentWizardStep(WIZARD_STEP_UPLOAD);
      return;
    }
    
    setImportStatistics(resultStatistics);
    setCurrentWizardStep(WIZARD_STEP_COMPLETE);
  };

  /**
   * Handles confirmed reset - clears all data and resets wizard state.
   * @returns {Promise<void>}
   */
  const handleConfirmedDataReset = async () => {
    if (!onReset) return;
    
    setIsResetOperationInProgress(true);
    
    // CRITICAL PATH: Execute the reset callback
    const [, resetErr] = await onReset();
    
    if (resetErr) {
      setErrorMessage('Failed to reset: ' + resetErr.message);
      setIsResetOperationInProgress(false);
      return;
    }
    
    // Reset all wizard state to initial values
    setCurrentWizardStep(WIZARD_STEP_UPLOAD);
    setParsedJsonData(null);
    setUploadedFileName(null);
    setImportStatistics(null);
    setErrorMessage(null);
    setIsResetDialogVisible(false);
    setIsResetOperationInProgress(false);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const hasValidFileUploaded = parsedJsonData !== null;
  const tripCountFromUploadedFile = extractTripCountFromJson(parsedJsonData);
  const dropZoneClasses = getDropZoneClassNames(isDraggingFileOver, hasValidFileUploaded);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* ================================================================
            HEADER SECTION - Animated gradient with step-specific content
            ================================================================ */}
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-6 text-center overflow-hidden">
          {/* Animated background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse delay-300" />
            <Plane className="absolute top-4 right-8 h-6 w-6 text-white/20 animate-bounce" />
            <MapPin className="absolute bottom-4 left-8 h-5 w-5 text-white/20 animate-bounce delay-150" />
          </div>
          
          {/* Header content with dynamic icon and text */}
          <div className="relative">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                {getStepIconComponent(currentWizardStep)}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {getStepTitleText(currentWizardStep)}
            </h2>
            <p className="text-white/80 text-sm">
              {getStepSubtitleText(currentWizardStep)}
            </p>
          </div>
        </div>

        {/* ================================================================
            CONTENT SECTION - Step-specific UI
            ================================================================ */}
        <div className="p-6">
          {/* Step 1: File Upload Interface */}
          {currentWizardStep === WIZARD_STEP_UPLOAD && (
            <div className="space-y-4">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Upload your travel itinerary JSON file to get started. Your data stays private and is stored only in your browser.
              </p>
              
              {/* File Drop Zone / Upload Area */}
              <div
                onClick={() => fileInputElementRef.current?.click()}
                onDragEnter={handleDragEnterOnDropZone}
                onDragOver={handleDragOverDropZone}
                onDragLeave={handleDragLeaveFromDropZone}
                onDrop={handleFileDropOnZone}
                className={dropZoneClasses}
              >
                <input
                  ref={fileInputElementRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {hasValidFileUploaded ? (
                  /* File Selected State */
                  <div className="space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full">
                      <FileJson className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-medium">{uploadedFileName}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {tripCountFromUploadedFile} trips found • Click to change
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Empty State - Awaiting File */
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

              {/* Feature Highlights */}
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

              {/* Error Message Display */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-300">{errorMessage}</span>
                </div>
              )}

              {/* Import Button */}
              <button
                onClick={handleStartImportProcess}
                disabled={!hasValidFileUploaded}
                className={classNames(
                  "w-full py-3 px-4 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                  hasValidFileUploaded
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                <Upload className="h-4 w-4" />
                Import Itinerary
              </button>
            </div>
          )}

          {/* Step 2: Import In Progress */}
          {currentWizardStep === WIZARD_STEP_IMPORTING && (
            <div className="space-y-4 py-4">
              {/* Animated Loading Spinner */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                  <Database className="absolute inset-0 m-auto h-6 w-6 text-zinc-400" />
                </div>
              </div>
              
              {/* Loading Status Text */}
              <div className="text-center space-y-1">
                <p className="text-zinc-300 text-sm">Importing your trip data...</p>
                <p className="text-zinc-500 text-xs">Setting up local database</p>
              </div>
              
              {/* Bouncing Dots Animation */}
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(dotIndex => (
                  <div
                    key={dotIndex}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${dotIndex * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Import Complete */}
          {currentWizardStep === WIZARD_STEP_COMPLETE && (
            <div className="space-y-4">
              {/* Success Icon and Message */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-zinc-300 text-sm">
                  Your itinerary has been set up successfully!
                </p>
              </div>

              {/* Import Statistics Grid */}
              {importStatistics && (
                <div className="bg-zinc-800/50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{importStatistics.trips || 0}</div>
                    <div className="text-xs text-zinc-500">Trips</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{importStatistics.segments || 0}</div>
                    <div className="text-xs text-zinc-500">Segments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{importStatistics.days || 0}</div>
                    <div className="text-xs text-zinc-500">Days</div>
                  </div>
                </div>
              )}

              {/* Start Exploring Button */}
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

        {/* ================================================================
            FOOTER SECTION - Progress dots and reset button
            ================================================================ */}
        <div className="px-6 pb-4 space-y-3">
          {/* Step Progress Indicator Dots */}
          <div className="flex justify-center gap-2">
            {[WIZARD_STEP_UPLOAD, WIZARD_STEP_IMPORTING, WIZARD_STEP_COMPLETE].map(stepNumber => (
              <div
                key={stepNumber}
                className={classNames(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  currentWizardStep >= stepNumber ? "bg-blue-500 w-4" : "bg-zinc-700"
                )}
              />
            ))}
          </div>
          
          {/* Reset Button - Only shown when onReset callback is provided */}
          {onReset && (
            <button
              onClick={() => setIsResetDialogVisible(true)}
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
        isDialogOpen={isResetDialogVisible}
        onConfirmReset={handleConfirmedDataReset}
        onCancelReset={() => setIsResetDialogVisible(false)}
        isResetInProgress={isResetOperationInProgress}
      />
    </div>
  );
}
