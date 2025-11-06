import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
} from "react-leaflet";

if (typeof L !== "undefined") {
  const defaultPrototype = L.Icon.Default.prototype as unknown as Record<
    string,
    unknown
  >;
  delete defaultPrototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface Vehicle {
  _id: string;
  vehicle_number: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  last_update?: string;
  timestamp?: string;
  path?: [number, number][]; // ✅ For polyline trail
  device?: {
    status: boolean;
    battery_level?: number | null;
  };
}

interface OpenStreetMapLiveTrackingProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicleId: string) => void;
  height?: string;
  showPolylines?: boolean; // ✅ Added this prop
}

const MapUpdater = ({
  selectedVehicle,
}: {
  selectedVehicle: Vehicle | undefined;
}) => {
  const map = useMap();
  const userInteractedRef = useRef(false);
  const lastVehicleIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const handleZoom = () => {
      userInteractedRef.current = true;
    };
    const handleDrag = () => {
      userInteractedRef.current = true;
    };

    map.on("zoom", handleZoom);
    map.on("drag", handleDrag);

    return () => {
      map.off("zoom", handleZoom);
      map.off("drag", handleDrag);
    };
  }, [map]);

  useEffect(() => {
    if (selectedVehicle?._id !== lastVehicleIdRef.current) {
      userInteractedRef.current = false;
      lastVehicleIdRef.current = selectedVehicle?._id;
    }
  }, [selectedVehicle?._id]);

  useEffect(() => {
    if (
      selectedVehicle &&
      selectedVehicle.latitude &&
      selectedVehicle.longitude &&
      !userInteractedRef.current
    ) {
      map.flyTo([selectedVehicle.latitude, selectedVehicle.longitude], 15, {
        duration: 2,
      });
    }
  }, [selectedVehicle, map]);

  return null;
};

const getSpeedColor = (speed: number | null): string => {
  const speedValue = speed ?? 0;
  if (speedValue === 0) return "#6B7280";
  if (speedValue < 30) return "#10B981";
  if (speedValue < 60) return "#F59E0B";
  return "#EF4444";
};

const createCustomMarker = (
  vehicle: Vehicle,
  isSelected: boolean,
  isConnected: boolean
): HTMLDivElement => {
  const div = document.createElement("div");
  const speedValue = vehicle.speed ?? 0;
  const speedColor = getSpeedColor(speedValue);
  const size = isSelected ? 32 : 28;
  const borderColor = isConnected ? "#10B981" : "#EF4444";
  const fillColor = isSelected ? "#3B82F6" : speedColor;

  div.innerHTML = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${fillColor};
      border: 3px solid ${borderColor};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s;
      font-weight: bold;
      font-size: 10px;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    ">
      ${Math.round(speedValue)}
    </div>
  `;
  return div;
};

const MarkerLayer = ({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  showPolylines = false, // ✅ default false
}: {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicleId: string) => void;
  showPolylines?: boolean;
}) => {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const popupRef = useRef<L.Popup | null>(null);

  useEffect(() => {
    const activeVehicles = new Set<string>();
    const markers = markersRef.current;

    vehicles.forEach((vehicle) => {
      if (
        !vehicle.latitude ||
        !vehicle.longitude ||
        (vehicle.latitude === 0 && vehicle.longitude === 0)
      )
        return;

      activeVehicles.add(vehicle._id);
      const isSelected = selectedVehicleId === vehicle._id;
      const isConnected = vehicle.device?.status !== false;
      const position = L.latLng(vehicle.latitude, vehicle.longitude);

      const existingMarker = markers.get(vehicle._id);

      if (existingMarker) {
        existingMarker.setLatLng(position);
        const newIcon = L.divIcon({
          html: createCustomMarker(vehicle, isSelected, isConnected).outerHTML,
          iconSize: [36, 36],
          className: "vehicle-marker",
        });
        existingMarker.setIcon(newIcon);
      } else {
        const marker = L.marker(position, {
          icon: L.divIcon({
            html: createCustomMarker(vehicle, isSelected, isConnected).outerHTML,
            iconSize: [36, 36],
            className: "vehicle-marker",
          }),
          title: vehicle.vehicle_number,
        });

        const popupContent = `
          <div style="font-size: 12px; color: #000; max-width: 250px;">
            <strong>${vehicle.vehicle_number}</strong>
            <div>Speed: ${(vehicle.speed ?? 0).toFixed(1)} km/h</div>
            <div>Course: ${(vehicle.course ?? 0).toFixed(1)}°</div>
            ${
              vehicle.device?.battery_level != null
                ? `<div>Battery: ${vehicle.device.battery_level.toFixed(0)}%</div>`
                : ""
            }
            <div>Status: <span style="color: ${
              isConnected ? "green" : "red"
            };">● ${isConnected ? "Connected" : "Disconnected"}</span></div>
            <div>Time: ${new Date(
              vehicle.last_update || vehicle.timestamp || new Date().toISOString()
            ).toLocaleTimeString()}</div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: "vehicle-popup",
        });

        marker.on("click", () => {
          if (popupRef.current) map.closePopup(popupRef.current);
          marker.openPopup();
          popupRef.current = marker.getPopup() || null;
          onVehicleSelect?.(vehicle._id);
        });

        marker.addTo(map);
        markers.set(vehicle._id, marker);
      }
    });

    markers.forEach((marker, vehicleId) => {
      if (!activeVehicles.has(vehicleId)) {
        map.removeLayer(marker);
        markers.delete(vehicleId);
      }
    });

    return () => {
      markers.forEach((marker) => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
      markers.clear();
    };
  }, [vehicles, selectedVehicleId, map, onVehicleSelect]);

  return (
    <>
      {showPolylines &&
        vehicles.map(
          (vehicle) =>
            vehicle.path &&
            vehicle.path.length > 1 && (
              <Polyline
                key={`poly-${vehicle._id}`}
                positions={vehicle.path}
                color="#3B82F6"
                weight={3}
                opacity={0.7}
              />
            )
        )}
    </>
  );
};

export default function OpenStreetMapLiveTracking({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  height = "700px",
  showPolylines = false,
}: OpenStreetMapLiveTrackingProps) {
  const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: "0.5rem",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerLayer
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleSelect={onVehicleSelect}
          showPolylines={showPolylines} // ✅ pass to MarkerLayer
        />

        <MapUpdater selectedVehicle={selectedVehicle} />
      </MapContainer>
    </div>
  );
}
