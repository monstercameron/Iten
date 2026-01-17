/**
 * @fileoverview Travel route map component for displaying flight paths
 * between departure and arrival airports with curved path visualization.
 * 
 * @description Features include:
 * - Airport coordinate lookup by IATA code
 * - Curved flight path (great circle approximation)
 * - Automatic zoom level calculation based on distance
 * - Dark theme map tiles
 * - Departure/arrival markers with popups
 */

import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Plane } from 'lucide-react';

/* ============================================================================
   AIRPORT COORDINATES DATABASE
   ============================================================================ */

/**
 * Airport and station coordinates lookup table
 * @constant {Object.<string, {lat: number, lng: number, name: string}>}
 */
const AIRPORT_COORDINATES_DATABASE = {
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

/**
 * Number of points to use for curved flight path interpolation
 * @constant {number}
 */
const FLIGHT_PATH_INTERPOLATION_POINTS = 50;

/**
 * Multiplier for flight path curve offset calculation
 * @constant {number}
 */
const CURVE_OFFSET_MULTIPLIER = 0.1;

/* ============================================================================
   MARKER ICON CONFIGURATION
   ============================================================================ */

/**
 * Leaflet marker icon configuration for departure airport
 * @constant {Icon}
 */
const DEPARTURE_AIRPORT_MARKER_ICON = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

/**
 * Leaflet marker icon configuration for arrival airport
 * @constant {Icon}
 */
const ARRIVAL_AIRPORT_MARKER_ICON = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

/**
 * Flight path polyline styling configuration
 * @constant {Object}
 */
const FLIGHT_PATH_STYLE = {
  color: '#3b82f6',
  weight: 2,
  opacity: 0.8,
  dashArray: '10, 10'
};

/* ============================================================================
   PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Extracts 3-letter IATA airport code from airport string
 * @pure
 * @param {string} airportString - String containing airport code (e.g., "FLL - Fort Lauderdale...")
 * @returns {string|null} 3-letter IATA code or null if not found
 */
const extractAirportCodeFromString = (airportString) => {
  if (!airportString) return null;
  const airportCodeMatch = airportString.match(/^([A-Z]{3})/);
  return airportCodeMatch ? airportCodeMatch[1] : null;
};

/**
 * Looks up airport coordinates by IATA code
 * @pure
 * @param {string} airportCode - 3-letter IATA airport code
 * @returns {{lat: number, lng: number, name: string}|null} Coordinate data or null
 */
const lookupAirportCoordinates = (airportCode) => {
  return airportCode ? AIRPORT_COORDINATES_DATABASE[airportCode] : null;
};

/**
 * Calculates center point between two coordinate pairs
 * @pure
 * @param {{lat: number, lng: number}} departureCoords - Departure airport coordinates
 * @param {{lat: number, lng: number}} arrivalCoords - Arrival airport coordinates
 * @returns {[number, number]} Center point as [latitude, longitude]
 */
const calculateMapCenterBetweenAirports = (departureCoords, arrivalCoords) => {
  const centerLatitude = (departureCoords.lat + arrivalCoords.lat) / 2;
  const centerLongitude = (departureCoords.lng + arrivalCoords.lng) / 2;
  return [centerLatitude, centerLongitude];
};

/**
 * Calculates appropriate zoom level based on coordinate distance
 * @pure
 * @param {{lat: number, lng: number}} departureCoords - Departure coordinates
 * @param {{lat: number, lng: number}} arrivalCoords - Arrival coordinates
 * @returns {number} Zoom level (1-6)
 */
const calculateZoomLevelFromDistance = (departureCoords, arrivalCoords) => {
  const latitudeDifference = Math.abs(departureCoords.lat - arrivalCoords.lat);
  const longitudeDifference = Math.abs(departureCoords.lng - arrivalCoords.lng);
  const maximumDifference = Math.max(latitudeDifference, longitudeDifference);
  
  if (maximumDifference > 100) return 1;
  if (maximumDifference > 50) return 2;
  if (maximumDifference > 20) return 3;
  if (maximumDifference > 10) return 4;
  if (maximumDifference > 5) return 5;
  return 6;
};

/**
 * Calculates maximum coordinate difference for curve offset calculation
 * @pure
 * @param {{lat: number, lng: number}} departureCoords - Departure coordinates
 * @param {{lat: number, lng: number}} arrivalCoords - Arrival coordinates
 * @returns {number} Maximum coordinate difference
 */
const calculateMaxCoordinateDifference = (departureCoords, arrivalCoords) => {
  const latitudeDifference = Math.abs(departureCoords.lat - arrivalCoords.lat);
  const longitudeDifference = Math.abs(departureCoords.lng - arrivalCoords.lng);
  return Math.max(latitudeDifference, longitudeDifference);
};

/**
 * Creates curved arc path between two points (great circle approximation)
 * @pure
 * @param {[number, number]} startPosition - Start coordinates [lat, lng]
 * @param {[number, number]} endPosition - End coordinates [lat, lng]
 * @param {number} maxDifference - Maximum coordinate difference for curve calculation
 * @returns {Array<[number, number]>} Array of interpolated points forming arc
 */
const createCurvedFlightPath = (startPosition, endPosition, maxDifference) => {
  const interpolatedPoints = [];
  
  for (let pointIndex = 0; pointIndex <= FLIGHT_PATH_INTERPOLATION_POINTS; pointIndex++) {
    const interpolationFactor = pointIndex / FLIGHT_PATH_INTERPOLATION_POINTS;
    
    // Linear interpolation between start and end points
    const interpolatedLatitude = startPosition[0] + (endPosition[0] - startPosition[0]) * interpolationFactor;
    const interpolatedLongitude = startPosition[1] + (endPosition[1] - startPosition[1]) * interpolationFactor;
    
    // Calculate curve offset using sine wave for natural arc appearance
    const curveOffset = Math.sin(interpolationFactor * Math.PI) * (maxDifference * CURVE_OFFSET_MULTIPLIER);
    
    interpolatedPoints.push([
      interpolatedLatitude + curveOffset * 0.3, 
      interpolatedLongitude
    ]);
  }
  
  return interpolatedPoints;
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * Travel route map displaying flight path between departure and arrival airports
 * 
 * @component
 * @param {Object} props
 * @param {string} props.departureAirport - Departure airport string (e.g., "FLL - Fort Lauderdale")
 * @param {string} props.arrivalAirport - Arrival airport string
 * @param {string} [props.route] - Optional custom route label override
 * @param {string} [props.type] - Type of travel (flight, train, etc.)
 * @returns {JSX.Element|null} Route map or null if coordinates unavailable
 */
export function TravelRouteMap({ departureAirport, arrivalAirport, route, type }) {
  // Extract IATA codes from airport strings
  const departureAirportCode = extractAirportCodeFromString(departureAirport);
  const arrivalAirportCode = extractAirportCodeFromString(arrivalAirport);
  
  // Lookup coordinates for both airports
  const departureCoordinates = lookupAirportCoordinates(departureAirportCode);
  const arrivalCoordinates = lookupAirportCoordinates(arrivalAirportCode);
  
  // CRITICAL: Early return if coordinates unavailable - can't render map
  if (!departureCoordinates || !arrivalCoordinates) {
    return null;
  }
  
  // Convert coordinates to Leaflet position format [lat, lng]
  const departureMarkerPosition = [departureCoordinates.lat, departureCoordinates.lng];
  const arrivalMarkerPosition = [arrivalCoordinates.lat, arrivalCoordinates.lng];
  
  // Calculate map center and zoom level
  const mapCenterPosition = calculateMapCenterBetweenAirports(departureCoordinates, arrivalCoordinates);
  const mapZoomLevel = calculateZoomLevelFromDistance(departureCoordinates, arrivalCoordinates);
  
  // Generate curved flight path between airports
  const maxCoordDifference = calculateMaxCoordinateDifference(departureCoordinates, arrivalCoordinates);
  const curvedFlightPathPositions = createCurvedFlightPath(
    departureMarkerPosition, 
    arrivalMarkerPosition,
    maxCoordDifference
  );

  // Generate route label (custom or default format)
  const routeDisplayLabel = route || `${departureAirportCode} → ${arrivalAirportCode}`;

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-blue-800/50" style={{ minHeight: '180px' }}>
      {/* Route Label Badge */}
      <div className="absolute top-2 left-2 z-[1000] bg-blue-900/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-2">
        <Plane size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-blue-200">
          {routeDisplayLabel}
        </span>
      </div>

      {/* Interactive Map Container */}
      <MapContainer
        center={mapCenterPosition}
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
        />
        
        {/* Curved Flight Path Polyline */}
        <Polyline
          positions={curvedFlightPathPositions}
          pathOptions={FLIGHT_PATH_STYLE}
        />
        
        {/* Departure Airport Marker */}
        <Marker position={departureMarkerPosition} icon={DEPARTURE_AIRPORT_MARKER_ICON}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">✈️ Departure</div>
              <div className="text-xs">{departureCoordinates.name} ({departureAirportCode})</div>
            </div>
          </Popup>
        </Marker>
        
        {/* Arrival Airport Marker */}
        <Marker position={arrivalMarkerPosition} icon={ARRIVAL_AIRPORT_MARKER_ICON}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">📍 Arrival</div>
              <div className="text-xs">{arrivalCoordinates.name} ({arrivalAirportCode})</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
