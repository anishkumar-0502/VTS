import React, { useEffect, useState, useMemo } from "react";
import { useMap, Polyline } from "react-leaflet";
import L from "leaflet";

type Location = {
  address: string;
  latitude: number;
  longitude: number;
};

type RoutePoint = {
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
};

interface OpenStreetRouteProps {
  startLocation: Location;
  endLocation: Location;
  stops: RoutePoint[];
  reverse?: boolean; 
}

function decodePolyline(str: string, precision = 5): L.LatLngLiteral[] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: L.LatLngLiteral[] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1 ? ~(result >> 1) : result >> 1);

    shift = 0; result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1 ? ~(result >> 1) : result >> 1);

    coordinates.push({ lat: lat / factor, lng: lng / factor });
  }

  return coordinates;
}

const OpenStreetRoute: React.FC<OpenStreetRouteProps> = ({
  startLocation,
  endLocation,
  stops,
}) => {
  const map = useMap();
  const [routeCoordinates, setRouteCoordinates] = useState<L.LatLngLiteral[]>([]);
  const [loading, setLoading] = useState(false);

  const hasValidPoints =
    startLocation.latitude &&
    startLocation.longitude &&
    endLocation.latitude &&
    endLocation.longitude;

  const orsCoordinates = useMemo(() => {
    if (!hasValidPoints) return null;

    return [
      startLocation,
      ...stops.sort((a, b) => a.sequence - b.sequence),
      endLocation,
    ].map((p) => [p.longitude, p.latitude]);
  }, [startLocation, endLocation, stops, hasValidPoints]);

  useEffect(() => {
    if (!orsCoordinates) return;

  const fetchRoute = async () => {
  setLoading(true);

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/route`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinates: orsCoordinates,
          preference: "shortest",
        }),
      }
    );

    const data = await res.json();

    if (!data.routes || !data.routes[0]) {
      setRouteCoordinates([]);
      return;
    }

    const encoded = data.routes[0].geometry;
    const decoded = decodePolyline(encoded);

    setRouteCoordinates(decoded);
    map.fitBounds(new L.LatLngBounds(decoded), { padding: [40, 40] });

  } catch (err) {
    console.error("Route error:", err);
    setRouteCoordinates([]);
  } finally {
    setLoading(false);
  }
};


    fetchRoute();
  }, [orsCoordinates, map]);

  if (loading) return null;

  return routeCoordinates.length ? (
    <Polyline
      positions={routeCoordinates}
      pathOptions={{ color: "#0078A8", weight: 5, opacity: 0.7 }}
    />
  ) : null;
};

export default OpenStreetRoute;
