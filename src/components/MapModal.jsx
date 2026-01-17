/**
 * @fileoverview Full-screen map modal component for displaying shelter locations
 * and activity routes with numbered markers and polyline connections.
 * 
 * @description Features include:
 * - Full-screen modal with dark theme map tiles
 * - Numbered activity markers with category-based colors
 * - Polyline route visualization between activities
 * - Google Maps integration for external navigation
 * - Automatic map bounds calculation for multiple markers
 */

import { X, MapPin, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { useEffect } from 'react';

/* ============================================================================
   MARKER ICON CONFIGURATION
   ============================================================================ */

/**
 * Default Leaflet marker icon configuration for shelter locations
 * @constant {Icon}
 */
const DEFAULT_MARKER_ICON = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Color mapping for activity categories displayed on map markers
 * @constant {Object.<string, string>}
 */
const ACTIVITY_CATEGORY_MARKER_COLORS = {
  Sports: '#3b82f6',
  Food: '#f97316',
  Sightseeing: '#a855f7',
  Shopping: '#ec4899',
  Logistics: '#71717a',
  Relaxation: '#06b6d4',
  Family: '#f43f5e',
  Rest: '#6366f1',
  Entertainment: '#8b5cf6',
  Cultural: '#ef4444',
  Personal: '#64748b',
  Transport: '#0ea5e9',
  Outdoor: '#22c55e',
  Nightlife: '#d946ef',
};

/**
 * Route polyline styling configuration
 * @constant {Object}
 */
const ROUTE_POLYLINE_STYLE = {
  color: '#14b8a6',
  weight: 3,
  opacity: 0.6,
  dashArray: '10, 10'
};

/* ============================================================================
   PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Creates a numbered circular marker icon for activity locations
 * @pure
 * @param {number} activityNumber - The sequence number to display on the marker
 * @param {string} [markerColor='#14b8a6'] - Background color for the marker circle
 * @returns {DivIcon} Leaflet DivIcon with numbered styling
 */
const createNumberedActivityMarkerIcon = (activityNumber, markerColor = '#14b8a6') => {
  return new DivIcon({
    html: `
      <div style="
        background-color: ${markerColor};
        border: 3px solid white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        color: white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      ">
        ${activityNumber}
      </div>
    `,
    className: 'custom-numbered-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

/**
 * Calculates appropriate zoom level based on geographic spread of markers
 * @pure
 * @param {number} latitudeSpread - Difference between max and min latitudes
 * @param {number} longitudeSpread - Difference between max and min longitudes
 * @returns {number} Zoom level (12-14)
 */
const calculateZoomLevelFromSpread = (latitudeSpread, longitudeSpread) => {
  const maximumSpread = Math.max(latitudeSpread, longitudeSpread);
  if (maximumSpread > 0.1) return 12;
  if (maximumSpread > 0.05) return 13;
  return 14;
};

/**
 * Calculates the center point from an array of coordinates
 * @pure
 * @param {Array<{lat: number, lng: number}>} coordinates - Array of coordinate objects
 * @returns {{center: [number, number], zoom: number}} Center point and calculated zoom
 */
const calculateMapCenterFromCoordinates = (coordinates) => {
  if (coordinates.length === 0) {
    return { center: [0, 0], zoom: 14 };
  }

  const latitudes = coordinates.map(coord => coord.lat);
  const longitudes = coordinates.map(coord => coord.lng);

  const centerLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const centerLongitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;

  const latitudeSpread = Math.max(...latitudes) - Math.min(...latitudes);
  const longitudeSpread = Math.max(...longitudes) - Math.min(...longitudes);
  const calculatedZoom = calculateZoomLevelFromSpread(latitudeSpread, longitudeSpread);

  return {
    center: [centerLatitude, centerLongitude],
    zoom: calculatedZoom
  };
};

/**
 * Filters activities to only those with valid coordinates
 * @pure
 * @param {Array<Object>} activities - Array of activity objects
 * @returns {Array<Object>} Activities with valid lat/lng coordinates
 */
const filterActivitiesWithValidCoordinates = (activities) => {
  return activities.filter(activity => 
    activity.coordinates?.lat && activity.coordinates?.lng
  );
};

/**
 * Transforms activity data into marker data format
 * @pure
 * @param {Array<Object>} validActivities - Activities with valid coordinates
 * @returns {Array<Object>} Marker data array
 */
const transformActivitiesToMarkerData = (validActivities) => {
  return validActivities.map((activity, index) => ({
    position: [activity.coordinates.lat, activity.coordinates.lng],
    name: activity.name,
    location: activity.location,
    category: activity.category,
    time: activity.timeStart || activity.time,
    index: index + 1
  }));
};

/**
 * Builds Google Maps URL for a shelter location
 * @pure
 * @param {Object} shelterData - Shelter data with coordinates and name
 * @returns {string} Google Maps search URL
 */
const buildShelterGoogleMapsUrl = (shelterData) => {
  const searchQuery = encodeURIComponent(
    shelterData.name || `${shelterData.coordinates.lat},${shelterData.coordinates.lng}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
};

/**
 * Builds Google Maps directions URL for multiple activity markers
 * @pure
 * @param {Array<Object>} markers - Array of marker objects with position arrays
 * @returns {string|null} Google Maps directions URL or null if insufficient markers
 */
const buildActivitiesDirectionsUrl = (markers) => {
  if (markers.length < 2) return null;

  const originMarker = markers[0];
  const destinationMarker = markers[markers.length - 1];

  let directionsUrl = `https://www.google.com/maps/dir/?api=1`;
  directionsUrl += `&origin=${originMarker.position[0]},${originMarker.position[1]}`;
  directionsUrl += `&destination=${destinationMarker.position[0]},${destinationMarker.position[1]}`;

  // Add intermediate waypoints if more than 2 markers
  if (markers.length > 2) {
    const waypointMarkers = markers.slice(1, -1);
    const waypointsString = waypointMarkers
      .map(marker => `${marker.position[0]},${marker.position[1]}`)
      .join('|');
    directionsUrl += `&waypoints=${waypointsString}`;
  }

  return directionsUrl;
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * @typedef {Object} ShelterData
 * @property {string} [name] - Name of the shelter/accommodation
 * @property {string} [address] - Street address
 * @property {string} [type] - Type of accommodation
 * @property {{lat: number, lng: number}} [coordinates] - Location coordinates
 */

/**
 * @typedef {Object} ActivitiesData
 * @property {Array<Object>} activities - Array of activity objects with coordinates
 */

/**
 * Full-screen map modal for displaying shelter locations or activity routes
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {'shelter'|'activities'} props.type - Type of map content to display
 * @param {ShelterData|ActivitiesData} props.data - Location data to display on map
 * @returns {JSX.Element|null} Map modal or null if not open
 */
export function MapModal({ isOpen, onClose, type, data }) {
  // CRITICAL: Prevent body scroll when modal is open for proper UX
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Early return if modal is closed - skip all map calculations
  if (!isOpen) return null;

  const isShelterMapType = type === 'shelter';
  const isActivitiesMapType = type === 'activities';

  // Initialize map state with defaults
  let mapCenterCoordinates = [0, 0];
  let mapZoomLevel = 14;
  let mapMarkerData = [];

  // CRITICAL: Calculate map center and markers based on content type
  if (isShelterMapType && data?.coordinates) {
    // Single shelter location - center on coordinates with higher zoom
    mapCenterCoordinates = [data.coordinates.lat, data.coordinates.lng];
    mapZoomLevel = 15;
    mapMarkerData = [{
      position: mapCenterCoordinates,
      name: data.name,
      address: data.address,
      type: data.type
    }];
  }

  if (isActivitiesMapType && data?.activities) {
    // Multiple activities - calculate bounds and center
    const activitiesWithValidCoordinates = filterActivitiesWithValidCoordinates(data.activities);
    
    if (activitiesWithValidCoordinates.length > 0) {
      const coordinates = activitiesWithValidCoordinates.map(a => a.coordinates);
      const { center, zoom } = calculateMapCenterFromCoordinates(coordinates);
      
      mapCenterCoordinates = center;
      mapZoomLevel = zoom;
      mapMarkerData = transformActivitiesToMarkerData(activitiesWithValidCoordinates);
    }
  }

  /**
   * Generates appropriate Google Maps URL based on map type
   * @returns {string|null} Google Maps URL or null if not applicable
   */
  const getExternalGoogleMapsUrl = () => {
    if (isShelterMapType && data?.coordinates) {
      return buildShelterGoogleMapsUrl(data);
    }
    if (isActivitiesMapType && mapMarkerData.length > 1) {
      return buildActivitiesDirectionsUrl(mapMarkerData);
    }
    return null;
  };

  const externalMapsUrl = getExternalGoogleMapsUrl();
  const modalHeaderTitle = isShelterMapType 
    ? (data?.name || 'Shelter Location') 
    : `Activity Locations (${mapMarkerData.length})`;
  const shouldShowRoutePolyline = isActivitiesMapType && mapMarkerData.length > 1;

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[90vh] md:h-[80vh] bg-zinc-900 rounded-xl md:rounded-2xl border border-zinc-700 overflow-hidden shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        {/* Modal Header with Title and Actions */}
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <MapPin className="h-4 w-4 md:h-5 md:w-5 text-blue-400 flex-shrink-0" />
            <span className="text-sm md:text-lg font-semibold text-white truncate">
              {modalHeaderTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {externalMapsUrl && (
              <a
                href={externalMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink size={14} className="md:hidden" />
                <ExternalLink size={16} className="hidden md:block" />
                <span className="hidden sm:inline">Open in Google Maps</span>
                <span className="sm:hidden">Maps</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <X size={18} className="md:hidden" />
              <X size={20} className="hidden md:block" />
            </button>
          </div>
        </div>

        {/* Interactive Map Container */}
        <div className="w-full h-full pt-12 md:pt-14">
          <MapContainer
            center={mapCenterCoordinates}
            zoom={mapZoomLevel}
            scrollWheelZoom={true}
            dragging={true}
            zoomControl={true}
            attributionControl={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            {/* Render markers for each location */}
            {mapMarkerData.map((markerItem, markerIndex) => {
              const markerIcon = isActivitiesMapType 
                ? createNumberedActivityMarkerIcon(
                    markerItem.index, 
                    ACTIVITY_CATEGORY_MARKER_COLORS[markerItem.category] || '#14b8a6'
                  )
                : DEFAULT_MARKER_ICON;
              
              return (
                <Marker key={markerIndex} position={markerItem.position} icon={markerIcon}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-zinc-900">{markerItem.name}</div>
                      {markerItem.location && <div className="text-zinc-600">{markerItem.location}</div>}
                      {markerItem.address && <div className="text-zinc-600">{markerItem.address}</div>}
                      {markerItem.time && <div className="text-zinc-500 mt-1">🕐 {markerItem.time}</div>}
                      {markerItem.category && <div className="text-zinc-500">{markerItem.category}</div>}
                      {markerItem.type && <div className="text-zinc-500">{markerItem.type}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Route polyline connecting activities in sequence */}
            {shouldShowRoutePolyline && (
              <Polyline
                positions={mapMarkerData.map(marker => marker.position)}
                color={ROUTE_POLYLINE_STYLE.color}
                weight={ROUTE_POLYLINE_STYLE.weight}
                opacity={ROUTE_POLYLINE_STYLE.opacity}
                dashArray={ROUTE_POLYLINE_STYLE.dashArray}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
