/**
 * @fileoverview Activity map preview component displaying multiple activity
 * locations with numbered markers and category-based coloring.
 * 
 * @description Features include:
 * - Numbered markers showing activity sequence order
 * - Category-based marker colors for visual distinction
 * - Google Maps integration for directions between activities
 * - Expandable full-screen modal view
 * - Automatic bounds calculation for multiple markers
 */

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { MapPin, ExternalLink, Maximize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MapModal } from './MapModal';

/* ============================================================================
   MARKER CONFIGURATION
   ============================================================================ */

/**
 * Category to color mapping for activity markers
 * @constant {Object.<string, string>}
 */
const ACTIVITY_CATEGORY_COLORS = {
  Sports: '#3b82f6',      // blue
  Food: '#f97316',        // orange
  Sightseeing: '#a855f7', // purple
  Shopping: '#ec4899',    // pink
  Logistics: '#71717a',   // zinc
  Relaxation: '#06b6d4',  // cyan
  Family: '#f43f5e',      // rose
  Rest: '#6366f1',        // indigo
  Entertainment: '#8b5cf6', // violet
  Cultural: '#ef4444',    // red
  Personal: '#64748b',    // slate
  Transport: '#0ea5e9',   // sky
  Outdoor: '#22c55e',     // green
  Nightlife: '#d946ef',   // fuchsia
};

/**
 * Default fallback color for activities without category mapping
 * @constant {string}
 */
const DEFAULT_MARKER_COLOR = '#14b8a6';

/**
 * Padding to add around bounds for visual breathing room
 * @constant {number}
 */
const MAP_BOUNDS_PADDING = 0.01;

/* ============================================================================
   PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Creates a numbered circular marker icon for activity locations
 * @pure
 * @param {number} activitySequenceNumber - The sequence number to display
 * @param {string} [markerBackgroundColor='#14b8a6'] - Background color for marker
 * @returns {DivIcon} Leaflet DivIcon with numbered styling
 */
const createNumberedActivityMarker = (activitySequenceNumber, markerBackgroundColor = DEFAULT_MARKER_COLOR) => {
  return new DivIcon({
    html: `
      <div style="
        background-color: ${markerBackgroundColor};
        border: 2px solid white;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${activitySequenceNumber}
      </div>
    `,
    className: 'custom-numbered-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

/**
 * Generates Google Maps search URL for a single location
 * @pure
 * @param {number} latitude - Location latitude
 * @param {number} longitude - Location longitude
 * @param {string} [locationName] - Optional name for search query
 * @returns {string} Google Maps search URL
 */
const buildGoogleMapsSearchUrl = (latitude, longitude, locationName) => {
  const searchQuery = encodeURIComponent(locationName || `${latitude},${longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${searchQuery}&center=${latitude},${longitude}`;
};

/**
 * Filters activities to only those with valid coordinates
 * @pure
 * @param {Array<Object>} activities - Array of activity objects
 * @returns {Array<Object>} Activities with valid lat/lng coordinates
 */
const filterActivitiesWithCoordinates = (activities) => {
  return activities.filter(activity => 
    activity.coordinates?.lat && activity.coordinates?.lng
  );
};

/**
 * Generates Google Maps directions URL for a route through multiple activities
 * @pure
 * @param {Array<Object>} activities - Array of activity objects with coordinates
 * @returns {string|null} Google Maps directions URL or null if insufficient activities
 */
const buildGoogleMapsDirectionsUrl = (activities) => {
  if (!activities || activities.length < 2) return null;
  
  const activitiesWithCoordinates = filterActivitiesWithCoordinates(activities);
  if (activitiesWithCoordinates.length < 2) return null;
  
  const originActivity = activitiesWithCoordinates[0];
  const destinationActivity = activitiesWithCoordinates[activitiesWithCoordinates.length - 1];
  const waypointActivities = activitiesWithCoordinates.slice(1, -1);
  
  let directionsUrl = `https://www.google.com/maps/dir/?api=1`;
  directionsUrl += `&origin=${originActivity.coordinates.lat},${originActivity.coordinates.lng}`;
  directionsUrl += `&destination=${destinationActivity.coordinates.lat},${destinationActivity.coordinates.lng}`;
  
  if (waypointActivities.length > 0) {
    const waypointsString = waypointActivities
      .map(waypoint => `${waypoint.coordinates.lat},${waypoint.coordinates.lng}`)
      .join('|');
    directionsUrl += `&waypoints=${waypointsString}`;
  }
  
  directionsUrl += `&travelmode=driving`;
  return directionsUrl;
};

/**
 * Calculates map bounds to fit all activity markers with padding
 * @pure
 * @param {Array<Object>} activitiesWithCoordinates - Activities with valid coordinates
 * @returns {Array<Array<number>>} Leaflet bounds array [[minLat, minLng], [maxLat, maxLng]]
 */
const calculateMapBoundsFromActivities = (activitiesWithCoordinates) => {
  const latitudes = activitiesWithCoordinates.map(activity => activity.coordinates.lat);
  const longitudes = activitiesWithCoordinates.map(activity => activity.coordinates.lng);
  
  return [
    [Math.min(...latitudes) - MAP_BOUNDS_PADDING, Math.min(...longitudes) - MAP_BOUNDS_PADDING],
    [Math.max(...latitudes) + MAP_BOUNDS_PADDING, Math.max(...longitudes) + MAP_BOUNDS_PADDING]
  ];
};

/**
 * Determines the marker color for an activity based on its category
 * @pure
 * @param {string} [category] - Activity category
 * @returns {string} Hex color code for the marker
 */
const getMarkerColorForCategory = (category) => {
  return ACTIVITY_CATEGORY_COLORS[category] || DEFAULT_MARKER_COLOR;
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * Compact map preview showing activity locations with numbered markers
 * 
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.activities - Array of activity objects
 * @param {number} [props.height=180] - Height of the map preview in pixels
 * @returns {JSX.Element|null} Map preview or null if no mappable activities
 */
export function ActivityMapPreview({ activities, height = 180 }) {
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

  // CRITICAL: Memoize filtered activities with display indices for marker numbering
  const activitiesWithMappableCoordinates = useMemo(() => {
    return (activities || [])
      .map((activity, index) => ({ ...activity, displayIndex: index + 1 }))
      .filter(activity => activity.coordinates?.lat && activity.coordinates?.lng);
  }, [activities]);

  // Early return if no activities can be displayed on map
  if (activitiesWithMappableCoordinates.length === 0) {
    return null;
  }

  // CRITICAL: Memoize bounds calculation to prevent recalculation on every render
  const mapBoundsForActivities = useMemo(() => {
    return calculateMapBoundsFromActivities(activitiesWithMappableCoordinates);
  }, [activitiesWithMappableCoordinates]);

  // Use center point for single activity, bounds for multiple
  const hasSingleActivity = activitiesWithMappableCoordinates.length === 1;
  const singleActivityCenter = hasSingleActivity 
    ? [activitiesWithMappableCoordinates[0].coordinates.lat, activitiesWithMappableCoordinates[0].coordinates.lng]
    : null;

  const googleMapsDirectionsUrl = buildGoogleMapsDirectionsUrl(activitiesWithMappableCoordinates);
  const totalMappableActivitiesCount = activitiesWithMappableCoordinates.length;

  return (
    <>
    <div className="relative w-full overflow-hidden rounded-lg border border-teal-900/50" style={{ height: `${height}px` }}>
      {/* Map Label Overlay - Activity Count Badge */}
      <div className="absolute top-2 left-2 z-[1000] bg-zinc-900/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-teal-700/50 flex items-center gap-1.5">
        <MapPin size={14} className="text-teal-400" />
        <span className="text-xs font-medium text-teal-200">
          🎯 Activity Locations ({totalMappableActivitiesCount})
        </span>
      </div>

      {/* External Google Maps Directions Link */}
      {googleMapsDirectionsUrl && (
        <a
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="absolute top-2 right-2 z-[1000] bg-teal-600/90 hover:bg-teal-500/90 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-teal-500/50 flex items-center gap-1.5 transition-colors"
        >
          <ExternalLink size={12} className="text-white" />
          <span className="text-xs font-medium text-white">Route in Maps</span>
        </a>
      )}

      {/* Expand to Full-Screen Modal Button */}
      <button
        onClick={(event) => {
          event.stopPropagation();
          setIsExpandedModalOpen(true);
        }}
        className="absolute bottom-2 right-2 z-[1000] bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur-sm p-1.5 rounded-lg border border-zinc-600/50 transition-colors"
        title="Expand map"
      >
        <Maximize2 size={14} className="text-white" />
      </button>

      {/* Interactive Map Container */}
      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer
          {...(singleActivityCenter ? { center: singleActivityCenter, zoom: 14 } : { bounds: mapBoundsForActivities })}
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
          
          {/* Render numbered markers for each activity */}
          {activitiesWithMappableCoordinates.map((activity) => {
            const markerPosition = [activity.coordinates.lat, activity.coordinates.lng];
            const markerColor = getMarkerColorForCategory(activity.category);
            const numberedMarkerIcon = createNumberedActivityMarker(activity.displayIndex, markerColor);
            const googleMapsLocationUrl = buildGoogleMapsSearchUrl(
              activity.coordinates.lat, 
              activity.coordinates.lng, 
              activity.location || activity.name
            );

            return (
              <Marker 
                key={activity.id || activity.displayIndex} 
                position={markerPosition} 
                icon={numberedMarkerIcon}
              >
                <Popup className="custom-popup">
                  <div className="text-sm min-w-[180px]">
                    <div className="font-semibold flex items-center gap-1">
                      {activity.icon} {activity.name}
                    </div>
                    {activity.location && (
                      <div className="text-xs text-gray-600 mt-1">
                        📍 {activity.location}
                      </div>
                    )}
                    {activity.timeStart && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        ⏰ {activity.timeStart}{activity.timeEnd ? ` - ${activity.timeEnd}` : ''}
                      </div>
                    )}
                    <a
                      href={googleMapsLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      <ExternalLink size={10} />
                      Open in Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Gradient overlay for visual aesthetics */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/30 via-transparent to-transparent z-[500]" />
    </div>

    {/* Expanded Full-Screen Map Modal */}
    <MapModal
      isOpen={isExpandedModalOpen}
      onClose={() => setIsExpandedModalOpen(false)}
      type="activities"
      data={{ activities }}
    />
    </>
  );
}
