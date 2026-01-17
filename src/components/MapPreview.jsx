/**
 * @fileoverview Map Preview component for displaying accommodation locations.
 * 
 * Features:
 * - Interactive Leaflet map with dark theme tiles
 * - Custom marker with popup showing location details
 * - "Open in Google Maps" external link
 * - Copy address to clipboard functionality
 * - Expand to fullscreen modal
 * 
 * @module components/MapPreview
 */

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, ExternalLink, Maximize2, Copy, Check } from 'lucide-react';
import { useState, memo, useCallback } from 'react';
import { MapModal } from './MapModal';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Custom Leaflet marker icon configuration.
 * Uses default Leaflet marker images from unpkg CDN.
 * @constant {Icon}
 */
const CUSTOM_MAP_MARKER_ICON = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/** @constant {number} Zoom level for hotels and accommodations */
const ACCOMMODATION_ZOOM_LEVEL = 15;

/** @constant {number} Default zoom level for general locations */
const DEFAULT_ZOOM_LEVEL = 13;

/** @constant {number} Duration in ms for copy feedback display */
const COPY_FEEDBACK_DURATION_MS = 2000;

/**
 * Map of accommodation types to emoji icons.
 * @constant {Object.<string, string>}
 */
const ACCOMMODATION_TYPE_EMOJI_MAP = {
  'Hotel': '🏨',
  'Airbnb': '🏠',
  'Personal residence': '🏡'
};

/** @constant {string} Default emoji for unknown accommodation types */
const DEFAULT_LOCATION_EMOJI = '📍';

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a Google Maps search URL for a location.
 * @pure
 * @param {number} latitude - The latitude coordinate
 * @param {number} longitude - The longitude coordinate
 * @param {string} locationName - The name of the location
 * @returns {string} Google Maps URL
 */
function buildGoogleMapsUrl(latitude, longitude, locationName) {
  const searchQuery = encodeURIComponent(locationName || `${latitude},${longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${searchQuery}&center=${latitude},${longitude}`;
}

/**
 * Determines the appropriate zoom level based on accommodation type.
 * @pure
 * @param {string} accommodationType - The type of accommodation
 * @returns {number} The zoom level to use
 */
function calculateZoomLevelForType(accommodationType) {
  const isDetailedLocation = accommodationType === 'Hotel' || accommodationType === 'Airbnb';
  return isDetailedLocation ? ACCOMMODATION_ZOOM_LEVEL : DEFAULT_ZOOM_LEVEL;
}

/**
 * Gets the emoji icon for an accommodation type.
 * @pure
 * @param {string} accommodationType - The type of accommodation
 * @returns {string} The emoji icon
 */
function getAccommodationTypeEmoji(accommodationType) {
  return ACCOMMODATION_TYPE_EMOJI_MAP[accommodationType] || DEFAULT_LOCATION_EMOJI;
}

/**
 * Validates that coordinates have required lat/lng values.
 * @pure
 * @param {Object} coordinates - The coordinates object
 * @returns {boolean} True if coordinates are valid
 */
function hasValidCoordinates(coordinates) {
  return coordinates?.lat != null && coordinates?.lng != null;
}

/**
 * Converts coordinates object to Leaflet position array.
 * @pure
 * @param {Object} coordinates - The coordinates with lat/lng
 * @returns {[number, number]} Position array [lat, lng]
 */
function toLeafletPosition(coordinates) {
  return [coordinates.lat, coordinates.lng];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * @typedef {Object} Coordinates
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 */

/**
 * @typedef {Object} MapPreviewProps
 * @property {Coordinates} coordinates - Location coordinates
 * @property {string} name - Name of the accommodation
 * @property {string} address - Street address
 * @property {string} type - Type of accommodation (Hotel, Airbnb, etc.)
 */

/**
 * Map Preview component for displaying accommodation locations.
 * 
 * Renders an interactive map with:
 * - Dark-themed CartoDB tiles
 * - Location marker with popup
 * - Overlay buttons for external links and actions
 * - Expandable to full-screen modal
 * 
 * @param {MapPreviewProps} props - Component properties
 * @returns {JSX.Element|null} The map preview or null if no valid coordinates
 */
export const MapPreview = memo(function MapPreview({ coordinates, name, address, type }) {
  // ============================================================================
  // STATE
  // ============================================================================
  
  /** @type {[boolean, Function]} Whether the fullscreen modal is open */
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  /** @type {[boolean, Function]} Whether the address was just copied */
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  // CRITICAL PATH: Early return if coordinates are invalid
  if (!hasValidCoordinates(coordinates)) {
    return null;
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const mapPosition = toLeafletPosition(coordinates);
  const googleMapsExternalUrl = buildGoogleMapsUrl(coordinates.lat, coordinates.lng, name || address);
  const mapZoomLevel = calculateZoomLevelForType(type);
  const accommodationEmoji = getAccommodationTypeEmoji(type);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Copies the address to clipboard with visual feedback.
   * @param {React.MouseEvent} clickEvent - The click event
   */
  const handleCopyAddressToClipboard = useCallback(async (clickEvent) => {
    clickEvent.stopPropagation();
    clickEvent.preventDefault();
    
    if (!address) return;

    const [, copyErr] = await navigator.clipboard.writeText(address).then(
      () => [undefined, null],
      (error) => [null, error instanceof Error ? error : new Error(String(error))]
    );
    
    if (copyErr) {
      console.error('Failed to copy address:', copyErr);
      return;
    }
    
    setIsAddressCopied(true);
    setTimeout(() => setIsAddressCopied(false), COPY_FEEDBACK_DURATION_MS);
  }, [address]);

  /**
   * Opens the fullscreen map modal.
   * @param {React.MouseEvent} clickEvent - The click event
   */
  const handleOpenMapModal = useCallback((clickEvent) => {
    clickEvent.stopPropagation();
    setIsMapModalOpen(true);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="relative w-full h-full overflow-hidden">
        {/* ================================================================
            OVERLAY: Location Label (Top Left)
            ================================================================ */}
        <div className="absolute top-3 left-3 z-[1000] bg-zinc-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-700/50 flex items-center gap-2">
          <MapPin size={18} className="text-blue-400" />
          <span className="text-sm font-medium text-zinc-200">
            {accommodationEmoji} {name || "Tonight's Stay"}
          </span>
        </div>

        {/* ================================================================
            OVERLAY: Open in Google Maps (Top Right)
            ================================================================ */}
        <a
          href={googleMapsExternalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          className="absolute top-3 right-3 z-[1000] bg-blue-600/90 hover:bg-blue-500/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-500/50 flex items-center gap-2 transition-colors"
        >
          <ExternalLink size={16} className="text-white" />
          <span className="text-sm font-medium text-white">Open in Maps</span>
        </a>

        {/* ================================================================
            OVERLAY: Copy Address Button (Bottom Left)
            ================================================================ */}
        {address && (
          <button
            onClick={handleCopyAddressToClipboard}
            className={`absolute bottom-3 left-3 z-[1000] backdrop-blur-sm px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
              isAddressCopied
                ? "bg-emerald-600/90 border-emerald-500/50"
                : "bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-600/50"
            }`}
            title={isAddressCopied ? "Copied!" : "Copy address"}
          >
            {isAddressCopied ? (
              <Check size={16} className="text-white" />
            ) : (
              <Copy size={16} className="text-white" />
            )}
            <span className="text-sm font-medium text-white">
              {isAddressCopied ? "Copied!" : "Copy Address"}
            </span>
          </button>
        )}

        {/* ================================================================
            OVERLAY: Expand Button (Bottom Right)
            ================================================================ */}
        <button
          onClick={handleOpenMapModal}
          className="absolute bottom-3 right-3 z-[1000] bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur-sm p-2 rounded-lg border border-zinc-600/50 transition-colors"
          title="Expand map"
        >
          <Maximize2 size={16} className="text-white" />
        </button>

        {/* ================================================================
            LEAFLET MAP
            ================================================================ */}
        <MapContainer
          center={mapPosition}
          zoom={mapZoomLevel}
          scrollWheelZoom={false}
          dragging={true}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          {/* Dark theme map tiles from CartoDB */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {/* Location Marker with Popup */}
          <Marker position={mapPosition} icon={CUSTOM_MAP_MARKER_ICON}>
            <Popup className="custom-popup">
              <div className="text-sm">
                <div className="font-semibold">{accommodationEmoji} {name}</div>
                {address && (
                  <div className="text-xs text-gray-600 mt-1">{address}</div>
                )}
                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={10} />
                  Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Gradient overlay for aesthetics */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent z-[500]" />
      </div>

      {/* Fullscreen Map Modal */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        type="shelter"
        data={{ coordinates, name, address, type }}
      />
    </>
  );
});
