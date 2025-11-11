import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";

if (typeof L !== "undefined") {
  const defaultPrototype = L.Icon.Default.prototype as unknown as Record<string, unknown>;
  delete defaultPrototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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
  path?: [number, number][];
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
  showPolylines?: boolean;
}

const MapUpdater = ({ selectedVehicle }: { selectedVehicle: Vehicle | undefined }) => {
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
      selectedVehicle.latitude != null &&
      selectedVehicle.longitude != null &&
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

const createVehicleIcon = (vehicle: Vehicle, isSelected: boolean, isConnected: boolean) => {
  const speedValue = vehicle.speed ?? 0;
  const speedColor = getSpeedColor(speedValue);
  const size = isSelected ? 32 : 28;
  const borderColor = isConnected ? "#10B981" : "#EF4444";
  const fillColor = isSelected ? "#3B82F6" : speedColor;

  return L.divIcon({
    html: `
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
    `,
    iconSize: [36, 36],
    className: "vehicle-marker",
  });
};

const VehicleMarker = ({
  vehicle,
  isSelected,
  onVehicleSelect,
}: {
  vehicle: Vehicle;
  isSelected: boolean;
  onVehicleSelect?: (vehicleId: string) => void;
}) => {
  const isConnected = vehicle.device?.status !== false;
  const markerIcon = useMemo(
    () => createVehicleIcon(vehicle, isSelected, isConnected),
    [vehicle, isSelected, isConnected]
  );

  const position: [number, number] = [vehicle.latitude ?? 0, vehicle.longitude ?? 0];
  const speedLabel = typeof vehicle.speed === "number" ? vehicle.speed.toFixed(1) : "0.0";
  const courseLabel = typeof vehicle.course === "number" ? vehicle.course.toFixed(1) : "0.0";
  const batteryValue =
    typeof vehicle.device?.battery_level === "number"
      ? `${Math.round(vehicle.device.battery_level)}%`
      : null;
  const timestamp = vehicle.timestamp || vehicle.last_update || new Date().toISOString();
  const trackerId = vehicle.device?.id || vehicle._id;

  return (
    <Marker
      position={position}
      icon={markerIcon}
      eventHandlers={{
        click: () => {
          onVehicleSelect?.(vehicle._id);
        },
      }}
    >
      <Popup>
        <div style={{ fontSize: "12px", color: "#000", maxWidth: "250px" }}>
          <div>
            <strong>Vehicle Number: {vehicle.vehicle_number || trackerId || "Unknown"}</strong>
          </div>
          {trackerId && <div>Tracker ID: {trackerId}</div>}
          <div>Speed: {speedLabel} km/h</div>
          <div>Course: {courseLabel}°</div>
          <div>
            Status: <span style={{ color: isConnected ? "green" : "red" }}>● {isConnected ? "Connected" : "Disconnected"}</span>
          </div>
          {batteryValue && <div>Battery: {batteryValue}</div>}
          <div>Time: {new Date(timestamp).toLocaleTimeString()}</div>
        </div>
      </Popup>
    </Marker>
  );
};

const MarkerLayer = ({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  showPolylines = false,
}: {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicleId: string) => void;
  showPolylines?: boolean;
}) => {
  return (
    <>
      {vehicles.map((vehicle) => {
        if (vehicle.latitude == null || vehicle.longitude == null) {
          return null;
        }
        return (
          <VehicleMarker
            key={vehicle._id}
            vehicle={vehicle}
            isSelected={selectedVehicleId === vehicle._id}
            onVehicleSelect={onVehicleSelect}
          />
        );
      })}
      {showPolylines &&
        vehicles.map((vehicle) =>
          vehicle.path && vehicle.path.length > 1 ? (
            <Polyline
              key={`poly-${vehicle._id}`}
              positions={vehicle.path.map(([lat, lng]) => [lat, lng])}
              color="#3B82F6"
              weight={3}
              opacity={0.7}
            />
          ) : null
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
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerLayer
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleSelect={onVehicleSelect}
          showPolylines={showPolylines}
        />

        <MapUpdater selectedVehicle={selectedVehicle} />
      </MapContainer>
    </div>
  );
}
