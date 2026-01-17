import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, ExternalLink, Maximize2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { MapModal } from './MapModal';

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

// Generate Google Maps URL for a location
function getGoogleMapsUrl(lat, lng, name) {
  const query = encodeURIComponent(name || `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&center=${lat},${lng}`;
}

export function MapPreview({ coordinates, name, address, type }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  if (!coordinates?.lat || !coordinates?.lng) {
    return null;
  }

  const position = [coordinates.lat, coordinates.lng];
  const mapsUrl = getGoogleMapsUrl(coordinates.lat, coordinates.lng, name || address);

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

  const handleCopyAddress = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  return (
    <>
      <div className="relative w-full h-full overflow-hidden">
        {/* Map Label Overlay */}
        <div className="absolute top-3 left-3 z-[1000] bg-zinc-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-700/50 flex items-center gap-2">
          <MapPin size={18} className="text-blue-400" />
          <span className="text-sm font-medium text-zinc-200">
            {getTypeEmoji()} {name || "Tonight's Stay"}
          </span>
        </div>

        {/* Open in Google Maps button - top right */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 z-[1000] bg-blue-600/90 hover:bg-blue-500/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-500/50 flex items-center gap-2 transition-colors"
        >
          <ExternalLink size={16} className="text-white" />
          <span className="text-sm font-medium text-white">Open in Maps</span>
        </a>

        {/* Copy address button - bottom left */}
        {address && (
          <button
            onClick={handleCopyAddress}
            className={`absolute bottom-3 left-3 z-[1000] backdrop-blur-sm px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
              copiedAddress
                ? "bg-emerald-600/90 border-emerald-500/50"
                : "bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-600/50"
            }`}
            title={copiedAddress ? "Copied!" : "Copy address"}
          >
            {copiedAddress ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-white" />}
            <span className="text-sm font-medium text-white">{copiedAddress ? "Copied!" : "Copy Address"}</span>
          </button>
        )}

        {/* Expand button - bottom right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className="absolute bottom-3 right-3 z-[1000] bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur-sm p-2 rounded-lg border border-zinc-600/50 transition-colors"
          title="Expand map"
        >
          <Maximize2 size={16} className="text-white" />
        </button>

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
              <a
                href={mapsUrl}
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

    {/* Expanded Map Modal */}
    <MapModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      type="shelter"
      data={{ coordinates, name, address, type }}
    />
    </>
  );
}
