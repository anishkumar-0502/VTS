import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const TripRouteMap = ({ source, destination, stops }) => {
  const [directions, setDirections] = useState(null);

  useEffect(() => {
    if (!source || !destination) return;

    const service = new google.maps.DirectionsService();

    const waypoints = stops.map((s) => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true,
    }));

    service.route(
      {
        origin: source,
        destination,
        waypoints,
        travelMode: "DRIVING",
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.log("Route error:", status);
        }
      }
    );
  }, [source, destination, stops]);

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={source || { lat: 20.5937, lng: 78.9629 }}
        zoom={6}
      >
        {source && <Marker position={source} label="S" />}
        {destination && <Marker position={destination} label="D" />}

        {stops.map((stop, i) => (
          <Marker key={i} position={stop} label={`${i + 1}`} />
        ))}

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default TripRouteMap;
