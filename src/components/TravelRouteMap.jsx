import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Plane } from 'lucide-react';

// Airport coordinates lookup
const AIRPORT_COORDS = {
  // US Airports
  'FLL': { lat: 26.0726, lng: -80.1527, name: 'Fort Lauderdale' },
  'SFO': { lat: 37.6213, lng: -122.3790, name: 'San Francisco' },
  'DEN': { lat: 39.8561, lng: -104.6737, name: 'Denver' },
  
  // Philippines Airports
  'MNL': { lat: 14.5086, lng: 121.0194, name: 'Manila' },
  'BCD': { lat: 10.7764, lng: 123.0148, name: 'Bacolod' },
  
  // Japan Airports
  'NRT': { lat: 35.7720, lng: 140.3929, name: 'Tokyo Narita' },
  'HND': { lat: 35.5494, lng: 139.7798, name: 'Tokyo Haneda' },
  
  // Train stations (for Shinkansen)
  'UENO': { lat: 35.7141, lng: 139.7774, name: 'Ueno Station' },
  'JOETSU': { lat: 37.1033, lng: 138.2531, name: 'Jōetsumyōkō Station' },
};

// Extract airport code from string like "FLL - Fort Lauderdale..."
function extractAirportCode(airportString) {
  if (!airportString) return null;
  const match = airportString.match(/^([A-Z]{3})/);
  return match ? match[1] : null;
}

// Custom icons
const departureIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

const arrivalIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

export function TravelRouteMap({ departureAirport, arrivalAirport, route, type }) {
  const depCode = extractAirportCode(departureAirport);
  const arrCode = extractAirportCode(arrivalAirport);
  
  const depCoords = depCode ? AIRPORT_COORDS[depCode] : null;
  const arrCoords = arrCode ? AIRPORT_COORDS[arrCode] : null;
  
  // Can't show map without both coordinates
  if (!depCoords || !arrCoords) {
    return null;
  }
  
  const depPosition = [depCoords.lat, depCoords.lng];
  const arrPosition = [arrCoords.lat, arrCoords.lng];
  
  // Calculate center point between two airports
  const centerLat = (depCoords.lat + arrCoords.lat) / 2;
  const centerLng = (depCoords.lng + arrCoords.lng) / 2;
  
  // Calculate appropriate zoom based on distance
  const latDiff = Math.abs(depCoords.lat - arrCoords.lat);
  const lngDiff = Math.abs(depCoords.lng - arrCoords.lng);
  const maxDiff = Math.max(latDiff, lngDiff);
  
  let zoom = 4;
  if (maxDiff > 100) zoom = 1;
  else if (maxDiff > 50) zoom = 2;
  else if (maxDiff > 20) zoom = 3;
  else if (maxDiff > 10) zoom = 4;
  else if (maxDiff > 5) zoom = 5;
  else zoom = 6;

  // Create curved path for flight route (great circle approximation)
  const createArcPath = (start, end, numPoints = 50) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Simple curved interpolation
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      // Add slight curve
      const curveOffset = Math.sin(t * Math.PI) * (maxDiff * 0.1);
      points.push([lat + curveOffset * 0.3, lng]);
    }
    return points;
  };

  const flightPath = createArcPath(depPosition, arrPosition);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-blue-800/50" style={{ minHeight: '180px' }}>
      {/* Route label */}
      <div className="absolute top-2 left-2 z-[1000] bg-blue-900/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-2">
        <Plane size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-blue-200">
          {route || `${depCode} → ${arrCode}`}
        </span>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* Dark theme tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Flight path line */}
        <Polyline
          positions={flightPath}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            opacity: 0.8,
            dashArray: '10, 10'
          }}
        />
        
        {/* Departure marker */}
        <Marker position={depPosition} icon={departureIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">✈️ Departure</div>
              <div className="text-xs">{depCoords.name} ({depCode})</div>
            </div>
          </Popup>
        </Marker>
        
        {/* Arrival marker */}
        <Marker position={arrPosition} icon={arrivalIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">📍 Arrival</div>
              <div className="text-xs">{arrCoords.name} ({arrCode})</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
