import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import OpenStreetMapLiveTracking from "../../components/OpenStreetMapLiveTracking";
import DebugPanel from "../../components/DebugPanel";
import { socketService, LiveTrackingUpdate } from "../../services/socket";
import api, { operatorsAPI, gpsAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams } from "react-router-dom";

interface VehicleLive {
  _id: string;
  vehicle_number: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  timestamp: string;
  last_update?: string;
  path?: [number, number][];
  device?: {
    id: string;
    status: boolean;
    battery_level?: number | null;
    last_signal?: string | null;
  };
  operatorId?: string | null;
}

interface OperatorOption {
  operator_id?: string;
  _id?: string;
  name?: string;
  full_name?: string;
  company_name?: string;
}

interface DeviceOption {
  device_id?: string;
  _id?: string;
  imei?: string;
  assigned_operator_id?: string | null;
   assigned_vehicle?: {
    vehicle_number?: string;
  } | null;
}

type ConnectionState = "connecting" | "connected" | "disconnected";

export default function LiveTracking() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userRole = user?.role;
  const isSuperAdmin = userRole === "superadmin";
  const isOperator = userRole === "operator";

  const [vehicles, setVehicles] = useState<VehicleLive[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedVehicleId, setSelectedVehicleIdState] = useState<string | null>(null);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("connecting");
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const vehicleMapRef = useRef<Map<string, VehicleLive>>(new Map());
  const hasDataRef = useRef(false);
  const selectedVehicleIdRef = useRef<string | null>(null);
  const selectedOperatorIdRef = useRef<string | null>(null);
  const filtersRef = useRef<{ operatorId?: string; deviceId?: string }>({});

  useEffect(() => {
    const deviceIdParam = searchParams.get("deviceId") ?? "";
    const vehicleIdParam = searchParams.get("vehicleId") ?? "";
    if (!deviceIdParam && !vehicleIdParam) {
      return;
    }
    if (deviceIdParam) {
      setSelectedDeviceId(deviceIdParam);
    }
    if (vehicleIdParam) {
      setSelectedVehicleIdState(vehicleIdParam);
      selectedVehicleIdRef.current = vehicleIdParam;
    }
  }, [searchParams]);

  const resetTrackingState = useCallback(() => {
    vehicleMapRef.current.clear();
    setVehicles([]);
    hasDataRef.current = false;
    setHasData(false);
    selectedVehicleIdRef.current = null;
    setSelectedVehicleIdState(null);
    setLastUpdateTime(null);
  }, []);

  const resolveOperatorLabel = (operator?: OperatorOption) =>
    operator?.company_name || operator?.full_name || operator?.name || operator?.operator_id || operator?._id || "";

  const resolveDeviceKey = (device?: DeviceOption) => device?.device_id || device?._id || device?.imei || "";

  useEffect(() => {
    selectedOperatorIdRef.current = selectedOperatorId;
  }, [selectedOperatorId]);

  const buildFilters = useCallback(() => {
    const filters: { operatorId?: string; deviceId?: string } = {};
    if (selectedOperatorId) {
      filters.operatorId = selectedOperatorId;
    }
    if (selectedDeviceId) {
      filters.deviceId = selectedDeviceId;
    }
    filtersRef.current = filters;
    return filters;
  }, [selectedOperatorId, selectedDeviceId]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }
    let active = true;
    const loadOperators = async () => {
      try {
        const response = await operatorsAPI.getAll();
        const list = Array.isArray(response) ? response : response?.data || [];
        if (active) {
          setOperators(list);
        }
      } catch {
        if (active) {
          setOperators([]);
        }
      }
    };
    loadOperators();
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isOperator) {
      return;
    }
    let active = true;
    const loadOperatorProfile = async () => {
      try {
        const response = await api.get("/operator/profile");
        const profile = (response?.data as any) || response;
        const operatorDetails = profile?.operator_details;
        const associated = Array.isArray(profile?.associated_operators) ? profile.associated_operators : [];
        const operatorList: OperatorOption[] = [];
        if (operatorDetails?.operator_id) {
          operatorList.push(operatorDetails);
        }
        associated.forEach((entry: OperatorOption) => {
          const key = entry?.operator_id || entry?._id;
          if (key && !operatorList.some((item) => (item.operator_id || item._id) === key)) {
            operatorList.push(entry);
          }
        });
        if (active) {
          if (operatorList.length) {
            setOperators(operatorList);
            const preferred = operatorDetails?.operator_id || operatorList[0]?.operator_id || operatorList[0]?._id;
            if (preferred && preferred !== selectedOperatorIdRef.current) {
              selectedOperatorIdRef.current = preferred;
              setSelectedOperatorId(preferred);
            }
          }
        }
      } catch {
        if (active) {
          setOperators((current) => (current.length ? current : []));
        }
      }
    };
    loadOperatorProfile();
    return () => {
      active = false;
    };
  }, [isOperator]);

  useEffect(() => {
    if (!isSuperAdmin && !isOperator) {
      return;
    }
    if (isSuperAdmin && !selectedOperatorId) {
      setDevices([]);
      setSelectedDeviceId("");
      return;
    }
    if (isOperator && !selectedOperatorId) {
      return;
    }
    let active = true;
    setSelectedDeviceId("");
    const loadDevices = async () => {
      try {
        if (isSuperAdmin) {
          const response = await gpsAPI.getAll();
          const list = Array.isArray(response) ? response : response?.data || [];
          const filtered = selectedOperatorId
            ? list.filter((device: DeviceOption) => device.assigned_operator_id === selectedOperatorId)
            : list;
          if (active) {
            setDevices(filtered);
          }
          return;
        }
        if (isOperator) {
          const response = await api.get("/operator/devices/list");
          const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
          if (active) {
            setDevices(list);
          }
          return;
        }
        if (active) {
          setDevices([]);
        }
      } catch {
        if (active) {
          setDevices([]);
        }
      }
    };
    loadDevices();
    return () => {
      active = false;
    };
  }, [isSuperAdmin, isOperator, selectedOperatorId]);

  useEffect(() => {
    buildFilters();
    resetTrackingState();
    if (socketService.isConnected()) {
      socketService.unsubscribeLiveTracking();
      setConnectionStatus("connecting");
      socketService.subscribeLiveTracking(filtersRef.current);
    }
  }, [buildFilters, resetTrackingState]);

  useEffect(() => {
    let isMounted = true;

    socketService.connect();
    setConnectionStatus(socketService.isConnected() ? "connected" : "connecting");
    if (socketService.isConnected()) {
      socketService.joinAdmin();
      socketService.subscribeLiveTracking(filtersRef.current);
    }

    const handleConnected = () => {
      if (!isMounted) return;
      setConnectionStatus("connected");
      socketService.joinAdmin();
      socketService.subscribeLiveTracking(filtersRef.current);
    };

    const handleDisconnected = () => {
      if (!isMounted) return;
      setConnectionStatus("disconnected");
    };

    const handleTrackingSubscribed = () => {
      if (!isMounted) return;
      setConnectionStatus("connected");
    };

    const handleSocketError = () => {
      if (!isMounted) return;
      setConnectionStatus("disconnected");
    };

    const handleLocationUpdate = (payload: unknown) => {
      handleLiveUpdate(payload);
    };

    const handleLiveUpdate = (payload: unknown) => {
      if (!isMounted) return;

      const update = payload as LiveTrackingUpdate & {
        lat?: number;
        lng?: number;
        vehicleNumber?: string;
        operatorId?: string | null;
      };
      const vehicleKey = update.vehicleId || update.trackerId || update.gpsDeviceId;
      if (!vehicleKey) return;

      const existingVehicle = vehicleMapRef.current.get(vehicleKey);

      const extractNumber = (value: unknown): number | null => {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === "string") {
          const parsed = parseFloat(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };

      const latitudeValue = extractNumber(update.latitude ?? update.lat);
      const longitudeValue = extractNumber(update.longitude ?? update.lng);
      const speedValue = extractNumber(update.speed);
      const courseValue = extractNumber(update.course);

      const latitude = latitudeValue ?? existingVehicle?.latitude ?? null;
      const longitude = longitudeValue ?? existingVehicle?.longitude ?? null;
      const speed = speedValue ?? existingVehicle?.speed ?? null;
      const course = courseValue ?? existingVehicle?.course ?? null;

      let path = existingVehicle?.path ?? [];
      if (latitudeValue !== null && longitudeValue !== null) {
        const lastPoint = path.length ? path[path.length - 1] : null;
        if (!lastPoint || lastPoint[0] !== latitudeValue || lastPoint[1] !== longitudeValue) {
          path = [...path, [latitudeValue, longitudeValue]];
          if (path.length > 200) {
            path = path.slice(path.length - 200);
          }
        }
      }

      let deviceInfo = existingVehicle?.device;
      if (update.device) {
        deviceInfo = {
          id: update.device.id || existingVehicle?.device?.id || update.gpsDeviceId || vehicleKey,
          status: update.device.status ?? existingVehicle?.device?.status ?? false,
          battery_level: update.device.battery_level ?? existingVehicle?.device?.battery_level ?? null,
          last_signal: update.device.last_signal ?? existingVehicle?.device?.last_signal ?? null,
        };
      } else if (!deviceInfo && update.gpsDeviceId) {
        deviceInfo = {
          id: update.gpsDeviceId,
          status: true,
          battery_level: null,
          last_signal: null,
        };
      }

      const timestampValue = update.timestamp || existingVehicle?.timestamp || new Date().toISOString();

      const updatedVehicle: VehicleLive = {
        _id: vehicleKey,
        vehicle_number:
          update.vehicle_number ||
          update.vehicleNumber ||
          existingVehicle?.vehicle_number ||
          vehicleKey,
        latitude,
        longitude,
        speed,
        course,
        timestamp: timestampValue,
        last_update: timestampValue,
        path: path.length > 0 ? path : existingVehicle?.path,
        device: deviceInfo,
        operatorId: update.operatorId ?? existingVehicle?.operatorId ?? null,
      };

      vehicleMapRef.current.set(vehicleKey, updatedVehicle);
      const nextVehicles = Array.from(vehicleMapRef.current.values());
      setVehicles(nextVehicles);
      setLastUpdateTime(timestampValue);
      setConnectionStatus("connected");

      if (!hasDataRef.current && nextVehicles.length > 0) {
        hasDataRef.current = true;
        setHasData(true);
      }

      if (!selectedVehicleIdRef.current) {
        selectedVehicleIdRef.current = vehicleKey;
        setSelectedVehicleIdState(vehicleKey);
      } else if (selectedVehicleIdRef.current === vehicleKey) {
        setSelectedVehicleIdState(vehicleKey);
      }
    };

    socketService.on("connected", handleConnected);
    socketService.on("disconnected", handleDisconnected);
    socketService.on("live_tracking_update", handleLiveUpdate);
    socketService.on("location_update", handleLocationUpdate);
    socketService.on("tracking_subscribed", handleTrackingSubscribed);
    socketService.on("error", handleSocketError);

    return () => {
      isMounted = false;
      socketService.unsubscribeLiveTracking();
      socketService.off("connected", handleConnected);
      socketService.off("disconnected", handleDisconnected);
      socketService.off("live_tracking_update", handleLiveUpdate);
      socketService.off("location_update", handleLocationUpdate);
      socketService.off("tracking_subscribed", handleTrackingSubscribed);
      socketService.off("error", handleSocketError);
    };
  }, []);

  const handleVehicleSelect = (vehicleId: string) => {
    selectedVehicleIdRef.current = vehicleId;
    setSelectedVehicleIdState(vehicleId);
  };

  const statusStyles = connectionStatus === "connected"
    ? { badge: "bg-green-100 text-green-700", dot: "bg-green-500" }
    : connectionStatus === "connecting"
      ? { badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500 animate-pulse" }
      : { badge: "bg-red-100 text-red-700", dot: "bg-red-500" };

  const selectedOperator = selectedOperatorId
    ? operators.find((operator) => (operator.operator_id || operator._id) === selectedOperatorId)
    : undefined;
  const selectedOperatorLabel = selectedOperatorId
    ? resolveOperatorLabel(selectedOperator) || selectedOperatorId
    : "All operators";

  const selectedDevice = selectedDeviceId
    ? devices.find((device) => resolveDeviceKey(device) === selectedDeviceId)
    : undefined;
  const selectedDeviceLabel = selectedDeviceId
    ? resolveDeviceKey(selectedDevice) || selectedDeviceId
    : "All devices";

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (isSuperAdmin && selectedOperatorId) {
        if (vehicle.operatorId !== selectedOperatorId) {
          return false;
        }
      }
      if (selectedDeviceId) {
        const identifiers: string[] = [];
        if (vehicle.device?.id) {
          identifiers.push(vehicle.device.id);
        }
        if (vehicle._id) {
          identifiers.push(vehicle._id);
        }
        if (!identifiers.includes(selectedDeviceId)) {
          return false;
        }
      }
      return true;
    });
  }, [vehicles, isSuperAdmin, selectedOperatorId, selectedDeviceId]);

  return (
    <>
      <PageMeta title="Live Vehicle Tracking | VTS Admin" description="Real-time vehicle tracking" />
      <div>
        <PageBreadCrumb pageTitle="Live Tracking" />

        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
              {connectionStatus === "connected" ? "Live" : connectionStatus === "connecting" ? "Connecting" : "Disconnected"}
            </span>
            <div className="text-xs text-gray-500">
              <span className="mr-3">Operator: {selectedOperatorLabel}</span>
              <span>Device: {selectedDeviceLabel}</span>
              {lastUpdateTime && (
                <span className="ml-3">Last update {new Date(lastUpdateTime).toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          <div className={`grid gap-4 ${isSuperAdmin ? "md:grid-cols-2" : ""}`}>
            {isSuperAdmin && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-semibold text-gray-700">Operator</label>
                <select
                  value={selectedOperatorId}
                  onChange={(event) => setSelectedOperatorId(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All operators</option>
                  {operators.map((operator) => {
                    const key = operator.operator_id || operator._id;
                    const label = resolveOperatorLabel(operator);
                    if (!key) {
                      return null;
                    }
                    return (
                      <option key={key} value={operator.operator_id || ""}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-gray-700">Device</label>
              <select
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                disabled={isSuperAdmin ? !selectedOperatorId : devices.length === 0}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">All devices</option>
                {devices.map((device) => {
                  const key = resolveDeviceKey(device);
                  if (!key) {
                    return null;
                  }
                  return (
                   <option key={key} value={device.device_id || device._id || ""}>
  {(device.device_id || device.imei) +
    (device.assigned_vehicle?.vehicle_number
      ? ` - ${device.assigned_vehicle.vehicle_number}`
      : "")}
</option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {!hasData && (
          <div className="mb-4 rounded-lg bg-blue-50 p-4 text-blue-700">
            Waiting for live tracking updates...
          </div>
        )}

        <OpenStreetMapLiveTracking
          vehicles={filteredVehicles}
          selectedVehicleId={selectedVehicleId ?? undefined}
          onVehicleSelect={handleVehicleSelect}
        />

        <DebugPanel />
      </div>
    </>
  );
}
