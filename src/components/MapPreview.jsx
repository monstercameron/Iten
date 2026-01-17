import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix for default marker icon issue in react-leaflet
// We'll use a custom marker icon
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export function MapPreview({ coordinates, name, address, type }) {
  if (!coordinates?.lat || !coordinates?.lng) {
    return null;
  }

  const position = [coordinates.lat, coordinates.lng];

  // Determine zoom level based on location type
  const zoomLevel = type === 'Hotel' || type === 'Airbnb' ? 15 : 13;

  // Get emoji for marker popup based on type
  const getTypeEmoji = () => {
    switch (type) {
      case 'Hotel': return '🏨';
      case 'Airbnb': return '🏠';
      case 'Personal residence': return '🏡';
      default: return '📍';
    }
  };

  return (
    <div className="relative w-full h-36 overflow-hidden">
      {/* Map Label Overlay */}
      <div className="absolute top-2 left-2 z-[1000] bg-zinc-900/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-zinc-700/50 flex items-center gap-1.5">
        <MapPin size={14} className="text-blue-400" />
        <span className="text-xs font-medium text-zinc-200">
          {getTypeEmoji()} {name || "Tonight's Stay"}
        </span>
      </div>

      <MapContainer
        center={position}
        zoom={zoomLevel}
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
        
        <Marker position={position} icon={customIcon}>
          <Popup className="custom-popup">
            <div className="text-sm">
              <div className="font-semibold">{getTypeEmoji()} {name}</div>
              {address && (
                <div className="text-xs text-gray-600 mt-1">{address}</div>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Gradient overlay for aesthetics */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent z-[500]" />
    </div>
  );
}
