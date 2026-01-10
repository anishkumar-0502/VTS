import React, { useEffect, useState } from "react";
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

interface SegmentRoute {
  coordinates: L.LatLngLiteral[];
  color: string;
  from: string;
  to: string;
}

interface StreetRouteProps {
  startLocation: Location;
  endLocation: Location;
  stops: RoutePoint[];
}

const StreetRoute: React.FC<StreetRouteProps> = ({
  startLocation,
  endLocation,
  stops,
}) => {
  const map = useMap();
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([]);

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

  const hasValidPoints =
    startLocation.latitude &&
    startLocation.longitude &&
    endLocation.latitude &&
    endLocation.longitude;

  useEffect(() => {
    if (!hasValidPoints) return;

    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

    const allPoints: (Location | RoutePoint)[] = [
      startLocation,
      ...sortedStops,
      endLocation,
    ];

    if (allPoints.length < 2) return;
    
    console.log("All waypoints for routing:", allPoints);

    const fetchSegments = async () => {
      const routes: SegmentRoute[] = [];

      for (let i = 0; i < allPoints.length - 1; i++) {
        const from = allPoints[i];
        const to = allPoints[i + 1];
        const color = colors[i % colors.length];

        const fromName = from.address || ("name" in from ? from.name : "Start");
        const toName = to.address || ("name" in to ? to.name : "End");
        
        console.log(`Routing segment ${i + 1}/${allPoints.length - 1}: ${fromName} → ${toName}`);

        try {
          const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;

          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson&overview=simplified&alternatives=false`
          );

          const data = await res.json();

          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map(
              (coord: [number, number]) => ({ lat: coord[1], lng: coord[0] })
            );

            console.log(`✓ Successfully routed ${fromName} → ${toName} (${coords.length} points)`);

            routes.push({
              coordinates: coords,
              color,
              from: fromName,
              to: toName,
            });
          } else {
            console.warn(`✗ No route found for ${fromName} → ${toName}`);
          }
        } catch (err) {
          console.error(`Error fetching route from ${fromName} to ${toName}:`, err);
          console.warn(`Using fallback straight line for ${fromName} → ${toName}`);
          
          const from_lat = from.latitude;
          const from_lng = from.longitude;
          const to_lat = to.latitude;
          const to_lng = to.longitude;

          routes.push({
            coordinates: [
              { lat: from_lat, lng: from_lng },
              { lat: to_lat, lng: to_lng },
            ],
            color,
            from: fromName,
            to: toName,
          });
        }
      }

      console.log(`Total segments created: ${routes.length}`);
      console.log("Route segments:", routes.map(r => `${r.from} → ${r.to} (${r.color})`));

      setSegmentRoutes(routes);

      if (routes.some((r) => r.coordinates.length > 0)) {
        const allCoords = routes.flatMap((r) => r.coordinates);
        if (allCoords.length > 0) {
          console.log(`Fitting bounds to ${allCoords.length} total coordinates`);
          map.fitBounds(new L.LatLngBounds(allCoords), { padding: [40, 40] });
        }
      }
    };

    fetchSegments();
  }, [startLocation, endLocation, stops, hasValidPoints, map]);

  if (segmentRoutes.length === 0) return null;

  return (
    <>
      {segmentRoutes.map((segment, idx) => (
        <Polyline
          key={idx}
          positions={segment.coordinates}
          pathOptions={{
            color: segment.color,
            weight: 5,
            opacity: 0.8,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      ))}
    </>
  );
};

export default StreetRoute;
