import React, { useCallback, useState } from "react";
import {
  GoogleMap,
  Marker,
  Polygon,
  useJsApiLoader,
  TrafficLayer,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const center = {
  lat: 13.0827,
  lng: 80.2707,
};

const polygonCoords = [
  { lat: 13.0817, lng: 80.2697 },
  { lat: 13.0837, lng: 80.2727 },
  { lat: 13.0817, lng: 80.2747 },
];

const GoogleMaps: React.FC = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [location, setLocation] = useState<google.maps.LatLngLiteral | null>(
    null
  );

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    // googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", 
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["geometry", "places"],
  });

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(coords);
        map?.panTo(coords);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Google Maps Dashboard
      </h1>

      {isLoaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Basic Map */}
          <MapCard title="Basic Map">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={12}
              onLoad={onLoad}
            />
          </MapCard>

          {/* 2. Map with Marker */}
          <MapCard title="Map with Marker">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={13}
            >
              <Marker position={center} />
            </GoogleMap>
          </MapCard>

          {/* 3. Geometry Overlays */}
          <MapCard title="Geometry Overlays">
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
              <Polygon
                paths={polygonCoords}
                options={{
                  fillColor: "#007bff",
                  fillOpacity: 0.3,
                  strokeColor: "#007bff",
                  strokeWeight: 2,
                }}
              />
            </GoogleMap>
          </MapCard>

          {/* 4. Geolocation */}
          <MapCard title="Geolocation">
            <button
              onClick={handleGeolocation}
              className="mb-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              Find My Location
            </button>
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
              {location && (
                <Marker position={location} label="You" />
              )}
            </GoogleMap>
          </MapCard>

          {/* 5. Styled Map (Night Mode) */}
          <MapCard title="Styled Map (Night Mode)">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={12}
              options={{
                styles: nightMapStyle,
              }}
            />
          </MapCard>

          {/* 6. Traffic Layer */}
          <MapCard title="Traffic Layer">
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
              <TrafficLayer />
            </GoogleMap>
          </MapCard>
        </div>
      ) : (
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-gray-500 text-lg">Loading Maps...</div>
        </div>
      )}
    </div>
  );
};

export default GoogleMaps;

// Reusable MapCard component
const MapCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="bg-white shadow-md rounded-2xl overflow-hidden border border-gray-200">
    <div className="px-4 py-2 bg-gray-50 border-b">
      <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
    </div>
    <div className="p-2">{children}</div>
  </div>
);

// Example styled map (Night Mode)
const nightMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
];
