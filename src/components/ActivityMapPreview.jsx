import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { MapPin, ExternalLink, Maximize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MapModal } from './MapModal';

// Custom numbered marker icons for activities
const createNumberedIcon = (number, color = '#14b8a6') => {
  return new DivIcon({
    html: `
      <div style="
        background-color: ${color};
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
        ${number}
      </div>
    `,
    className: 'custom-numbered-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

// Category to color mapping
const categoryColors = {
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

// Generate Google Maps URL
function getGoogleMapsUrl(lat, lng, name) {
  const query = encodeURIComponent(name || `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&center=${lat},${lng}`;
}

// Generate Google Maps directions URL
function getGoogleMapsDirectionsUrl(activities) {
  if (!activities || activities.length < 2) return null;
  
  const validActivities = activities.filter(a => a.coordinates?.lat && a.coordinates?.lng);
  if (validActivities.length < 2) return null;
  
  const origin = validActivities[0];
  const destination = validActivities[validActivities.length - 1];
  const waypoints = validActivities.slice(1, -1);
  
  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${origin.coordinates.lat},${origin.coordinates.lng}`;
  url += `&destination=${destination.coordinates.lat},${destination.coordinates.lng}`;
  
  if (waypoints.length > 0) {
    const waypointStr = waypoints
      .map(w => `${w.coordinates.lat},${w.coordinates.lng}`)
      .join('|');
    url += `&waypoints=${waypointStr}`;
  }
  
  url += `&travelmode=driving`;
  return url;
}

export function ActivityMapPreview({ activities, height = 180 }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter activities that have coordinates
  const mappableActivities = useMemo(() => {
    return (activities || [])
      .map((activity, index) => ({ ...activity, displayIndex: index + 1 }))
      .filter(a => a.coordinates?.lat && a.coordinates?.lng);
  }, [activities]);

  if (mappableActivities.length === 0) {
    return null;
  }

  // Calculate bounds to fit all markers
  const bounds = useMemo(() => {
    const lats = mappableActivities.map(a => a.coordinates.lat);
    const lngs = mappableActivities.map(a => a.coordinates.lng);
    return [
      [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01]
    ];
  }, [mappableActivities]);

  // Use center if only one activity, otherwise use bounds
  const center = mappableActivities.length === 1 
    ? [mappableActivities[0].coordinates.lat, mappableActivities[0].coordinates.lng]
    : null;

  const directionsUrl = getGoogleMapsDirectionsUrl(mappableActivities);

  return (
    <>
    <div className="relative w-full overflow-hidden rounded-lg border border-teal-900/50" style={{ height: `${height}px` }}>
      {/* Map Label Overlay */}
      <div className="absolute top-2 left-2 z-[1000] bg-zinc-900/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-teal-700/50 flex items-center gap-1.5">
        <MapPin size={14} className="text-teal-400" />
        <span className="text-xs font-medium text-teal-200">
          🎯 Activity Locations ({mappableActivities.length})
        </span>
      </div>

      {/* Open in Google Maps button - top right */}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-[1000] bg-teal-600/90 hover:bg-teal-500/90 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-teal-500/50 flex items-center gap-1.5 transition-colors"
        >
          <ExternalLink size={12} className="text-white" />
          <span className="text-xs font-medium text-white">Route in Maps</span>
        </a>
      )}

      {/* Expand button - bottom right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className="absolute bottom-2 right-2 z-[1000] bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur-sm p-1.5 rounded-lg border border-zinc-600/50 transition-colors"
        title="Expand map"
      >
        <Maximize2 size={14} className="text-white" />
      </button>

      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer
          {...(center ? { center, zoom: 14 } : { bounds })}
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
          
          {mappableActivities.map((activity) => {
            const position = [activity.coordinates.lat, activity.coordinates.lng];
            const color = categoryColors[activity.category] || '#14b8a6';
            const icon = createNumberedIcon(activity.displayIndex, color);
            const mapsUrl = getGoogleMapsUrl(
              activity.coordinates.lat, 
              activity.coordinates.lng, 
              activity.location || activity.name
            );

            return (
              <Marker 
                key={activity.id || activity.displayIndex} 
                position={position} 
                icon={icon}
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
                      href={mapsUrl}
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

      {/* Gradient overlay for aesthetics */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/30 via-transparent to-transparent z-[500]" />
    </div>

    {/* Expanded Map Modal */}
    <MapModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      type="activities"
      data={{ activities }}
    />
    </>
  );
}
