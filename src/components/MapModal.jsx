import { X, MapPin, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';

// Custom marker icon
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Numbered marker for activities
const createNumberedIcon = (number, color = '#14b8a6') => {
  return new DivIcon({
    html: `
      <div style="
        background-color: ${color};
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
        ${number}
      </div>
    `,
    className: 'custom-numbered-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Category colors for activities
const categoryColors = {
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

export function MapModal({ isOpen, onClose, type, data }) {
  if (!isOpen) return null;

  // Prevent body scroll when modal is open
  if (typeof document !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  const isShelter = type === 'shelter';
  const isActivities = type === 'activities';

  // Get center and markers based on type
  let center = [0, 0];
  let zoom = 14;
  let markers = [];

  if (isShelter && data?.coordinates) {
    center = [data.coordinates.lat, data.coordinates.lng];
    zoom = 15;
    markers = [{
      position: center,
      name: data.name,
      address: data.address,
      type: data.type
    }];
  }

  if (isActivities && data?.activities) {
    const validActivities = data.activities.filter(a => a.coordinates?.lat && a.coordinates?.lng);
    if (validActivities.length > 0) {
      // Calculate bounds
      const lats = validActivities.map(a => a.coordinates.lat);
      const lngs = validActivities.map(a => a.coordinates.lng);
      center = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2
      ];
      
      // Adjust zoom based on spread
      const latSpread = Math.max(...lats) - Math.min(...lats);
      const lngSpread = Math.max(...lngs) - Math.min(...lngs);
      const maxSpread = Math.max(latSpread, lngSpread);
      if (maxSpread > 0.1) zoom = 12;
      else if (maxSpread > 0.05) zoom = 13;
      else zoom = 14;

      markers = validActivities.map((activity, idx) => ({
        position: [activity.coordinates.lat, activity.coordinates.lng],
        name: activity.name,
        location: activity.location,
        category: activity.category,
        time: activity.timeStart || activity.time,
        index: idx + 1
      }));
    }
  }

  const getGoogleMapsUrl = () => {
    if (isShelter && data?.coordinates) {
      const query = encodeURIComponent(data.name || `${data.coordinates.lat},${data.coordinates.lng}`);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    if (isActivities && markers.length > 1) {
      // Directions URL
      const origin = markers[0];
      const dest = markers[markers.length - 1];
      let url = `https://www.google.com/maps/dir/?api=1`;
      url += `&origin=${origin.position[0]},${origin.position[1]}`;
      url += `&destination=${dest.position[0]},${dest.position[1]}`;
      if (markers.length > 2) {
        const waypoints = markers.slice(1, -1).map(m => `${m.position[0]},${m.position[1]}`).join('|');
        url += `&waypoints=${waypoints}`;
      }
      return url;
    }
    return null;
  };

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[80vh] bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-blue-400" />
            <span className="text-lg font-semibold text-white">
              {isShelter ? (data?.name || 'Shelter Location') : `Activity Locations (${markers.length})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getGoogleMapsUrl() && (
              <a
                href={getGoogleMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Open in Google Maps
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="w-full h-full pt-14">
          <MapContainer
            center={center}
            zoom={zoom}
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
            
            {markers.map((marker, idx) => {
              const icon = isActivities 
                ? createNumberedIcon(marker.index, categoryColors[marker.category] || '#14b8a6')
                : defaultIcon;
              
              return (
                <Marker key={idx} position={marker.position} icon={icon}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-zinc-900">{marker.name}</div>
                      {marker.location && <div className="text-zinc-600">{marker.location}</div>}
                      {marker.address && <div className="text-zinc-600">{marker.address}</div>}
                      {marker.time && <div className="text-zinc-500 mt-1">🕐 {marker.time}</div>}
                      {marker.category && <div className="text-zinc-500">{marker.category}</div>}
                      {marker.type && <div className="text-zinc-500">{marker.type}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Draw lines between activities */}
            {isActivities && markers.length > 1 && (
              <Polyline
                positions={markers.map(m => m.position)}
                color="#14b8a6"
                weight={3}
                opacity={0.6}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
