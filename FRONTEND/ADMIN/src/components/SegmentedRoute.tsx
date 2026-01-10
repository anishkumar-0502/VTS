import React, { useEffect, useState } from "react";
import { useMap, Polyline, Popup } from "react-leaflet";
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

interface SegmentedRouteProps {
  startLocation: Location;
  endLocation: Location;
  stops: RoutePoint[];
}

interface SegmentRoute {
  from: string;
  to: string;
  coordinates: L.LatLngLiteral[];
  distance?: number;
  duration?: number;
  isFallback?: boolean;
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

const SegmentedRoute: React.FC<SegmentedRouteProps> = ({
  startLocation,
  endLocation,
  stops,
}) => {
  const map = useMap();
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([]);
  const [loading, setLoading] = useState(false);

  const hasValidPoints =
    startLocation.latitude &&
    startLocation.longitude &&
    endLocation.latitude &&
    endLocation.longitude;

  const segmentCoordinates = React.useMemo(() => {
    if (!hasValidPoints) return [];

    const allPoints = [
      startLocation,
      ...stops.sort((a, b) => a.sequence - b.sequence),
      endLocation,
    ];

    const segments = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const from = allPoints[i];
      const to = allPoints[i + 1];
      segments.push({
        from: ("address" in from ? from.address : from.name) || `Point ${i}`,
        to: ("address" in to ? to.address : to.name) || `Point ${i + 1}`,
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
      });
    }

    return segments;
  }, [startLocation, endLocation, stops, hasValidPoints]);

  useEffect(() => {
    if (segmentCoordinates.length === 0) return;

    const fetchSegmentRoutes = async () => {
      setLoading(true);

      try {
        const routesData: SegmentRoute[] = [];
        console.log("Fetching routes for segments:", segmentCoordinates);

        for (const segment of segmentCoordinates) {
          try {
            const url = `${import.meta.env.VITE_API_URL}/route`;
            console.log("API URL:", url);
            console.log("Segment coordinates:", segment.coordinates);

            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                coordinates: segment.coordinates,
                preference: "shortest",
              }),
            });

            if (!res.ok) {
              console.error(`API error for segment ${segment.from} → ${segment.to}:`, res.status, res.statusText);
              routesData.push({
                from: segment.from,
                to: segment.to,
                coordinates: [],
              });
              continue;
            }

            const data = await res.json();
            console.log("Route response for", segment.from, "→", segment.to, ":", data);

            if (data.routes && data.routes[0] && data.routes[0].geometry) {
              const encoded = data.routes[0].geometry;
              const decoded = decodePolyline(encoded);
              routesData.push({
                from: segment.from,
                to: segment.to,
                coordinates: decoded,
                distance: data.routes[0].distance,
                duration: data.routes[0].duration,
              });
            } else if (data.geometry) {
              const decoded = decodePolyline(data.geometry);
              routesData.push({
                from: segment.from,
                to: segment.to,
                coordinates: decoded,
                distance: data.distance,
                duration: data.duration,
              });
            } else {
              console.warn("No geometry found in response for", segment.from, "→", segment.to);
              console.warn("Using fallback straight line for segment");
              const from = segment.coordinates[0];
              const to = segment.coordinates[1];
              routesData.push({
                from: segment.from,
                to: segment.to,
                coordinates: [
                  { lat: from[1], lng: from[0] },
                  { lat: to[1], lng: to[0] },
                ],
                isFallback: true,
              });
            }
          } catch (segmentErr) {
            console.error("Error fetching route segment:", segmentErr);
            console.warn("Using fallback straight line due to error");
            const from = segment.coordinates[0];
            const to = segment.coordinates[1];
            routesData.push({
              from: segment.from,
              to: segment.to,
              coordinates: [
                { lat: from[1], lng: from[0] },
                { lat: to[1], lng: to[0] },
              ],
              isFallback: true,
            });
          }
        }

        console.log("All routes data:", routesData);
        setSegmentRoutes(routesData);

        if (routesData.some(r => r.coordinates.length > 0)) {
          const allCoords = routesData.flatMap(r => r.coordinates);
          if (allCoords.length > 0) {
            map.fitBounds(new L.LatLngBounds(allCoords), { padding: [40, 40] });
          }
        }
      } catch (err) {
        console.error("Route segments error:", err);
        setSegmentRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSegmentRoutes, 300);
    return () => clearTimeout(timeoutId);
  }, [segmentCoordinates, map]);

  const colors = [
    "#0078A8",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B88B",
  ];

  const routesToRender = segmentRoutes.length > 0 
    ? segmentRoutes
    : segmentCoordinates.map((seg, idx) => {
        const from = seg.coordinates[0];
        const to = seg.coordinates[1];
        return {
          from: seg.from,
          to: seg.to,
          coordinates: [
            { lat: from[1], lng: from[0] },
            { lat: to[1], lng: to[0] },
          ],
          isFallback: true,
        };
      });

  return (
    <>
      {routesToRender.map((route, idx) => {
        const hasCoordinates = route.coordinates.length > 0;
        if (!hasCoordinates) return null;

        const isFallback = route.isFallback === true;

        return (
          <Polyline
            key={idx}
            positions={route.coordinates}
            pathOptions={{
              color: colors[idx % colors.length],
              weight: 4,
              opacity: isFallback ? 0.5 : 0.8,
              lineCap: "round",
              lineJoin: "round",
              dashArray: isFallback ? "5, 5" : undefined,
            }}
            eventHandlers={{
              mouseover: (e) => {
                e.target.setStyle({ weight: 6, opacity: 1 });
              },
              mouseout: (e) => {
                e.target.setStyle({ weight: 4, opacity: 0.8 });
              },
            }}
          >
            {route.distance || route.duration ? (
              <Popup>
                <div style={{ fontSize: "12px" }}>
                  <strong>
                    {route.from} → {route.to}
                  </strong>
                  {route.distance && (
                    <p>Distance: {(route.distance / 1000).toFixed(2)} km</p>
                  )}
                  {route.duration && (
                    <p>Duration: {Math.round(route.duration / 60)} min</p>
                  )}
                </div>
              </Popup>
            ) : null}
          </Polyline>
        );
      })}
    </>
  );
};

export default SegmentedRoute;
