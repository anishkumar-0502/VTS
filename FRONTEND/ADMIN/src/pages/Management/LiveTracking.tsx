import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import OpenStreetMapLiveTracking from "../../components/OpenStreetMapLiveTracking";
import DebugPanel from "../../components/DebugPanel";
import Swal from "sweetalert2";

// ✅ Base URL from environment or fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ---------- Types ---------- */
interface Operator {
  _id: string;
  name: string;
  drivers: Driver[];
}

interface Driver {
  _id: string;
  name: string;
  vehicles: VehicleLive[];
}

interface VehicleLive {
  _id: string;
  vehicle_number: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  timestamp: string;
  polyline?: [number, number][];
  device?: {
    id: string;
    status: boolean;
    battery_level?: number | null;
    last_signal?: string;
  };
}

interface SpeedHistory {
  time: string;
  speed: number;
}

/* ---------- Auth Helper (Token) ---------- */
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

/* ---------- Component ---------- */
export default function LiveTracking() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [speedHistory, setSpeedHistory] = useState<SpeedHistory[]>([]);

  const vehicleMapRef = useRef<Map<string, VehicleLive>>(new Map());
  const operatorMapRef = useRef<
    Map<string, { name: string; driverId: string; operatorId: string }>
  >(new Map());

  /* ---------- Fetch Live Tracking Data ---------- */
  const fetchLiveData = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/superadmin/tracking/live-data`, {
        method: "GET",
        headers: getAuthHeaders(), // ✅ includes Authorization header
      });

      if (!res.ok) {
        const errData = await res.json();
        Swal.fire("Error", errData.message || "Unauthorized / Invalid token", "error");
        setLoading(false);
        return;
      }

      const response = await res.json();
      const { data } = response;

      if (!Array.isArray(data)) {
        Swal.fire("Error", "Invalid response format from backend", "error");
        setLoading(false);
        return;
      }

      const operatorsMap = new Map<string, Operator>();
      const vehicleMetaMap = new Map<
        string,
        { name: string; driverId: string; operatorId: string }
      >();

      data.forEach((v: any) => {
        const operatorId = v.operator_id || "unassigned";
        const driverId = v.driver_id || "unassigned";
        const vehicleId = v.vehicle_id || v._id || crypto.randomUUID();

        if (!operatorsMap.has(operatorId)) {
          operatorsMap.set(operatorId, {
            _id: operatorId,
            name: v.operator_name || "Unnamed Operator",
            drivers: [],
          });
        }

        const operator = operatorsMap.get(operatorId)!;
        let driver = operator.drivers.find((d) => d._id === driverId);

        if (!driver) {
          driver = {
            _id: driverId,
            name: v.driver_name || "Unnamed Driver",
            vehicles: [],
          };
          operator.drivers.push(driver);
        }

        const vehicle: VehicleLive = {
          _id: vehicleId,
          vehicle_number: v.vehicle_number || "Unknown",
          latitude: v.latitude || 0,
          longitude: v.longitude || 0,
          speed: v.speed || 0,
          course: v.course || 0,
          timestamp: v.timestamp || new Date().toISOString(),
          polyline: [[v.latitude, v.longitude]],
          device: v.device
            ? {
                id: v.device.id || "",
                status: v.device.status || false,
                battery_level: v.device.battery_level || null,
                last_signal: v.device.last_signal || "",
              }
            : undefined,
        };

        driver.vehicles.push(vehicle);
        vehicleMapRef.current.set(vehicleId, vehicle);
        vehicleMetaMap.set(vehicleId, { name: v.vehicle_number, driverId, operatorId });
      });

      operatorMapRef.current = vehicleMetaMap;
      setOperators(Array.from(operatorsMap.values()));
    } catch (err) {
      console.error("Error fetching live data:", err);
      Swal.fire("Error", "Unable to fetch live tracking data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  /* ---------- Derived Data ---------- */
  const currentOperator = useMemo(
    () => operators.find((o) => o._id === selectedOperator),
    [operators, selectedOperator]
  );
  const currentDriver = useMemo(
    () => currentOperator?.drivers.find((d) => d._id === selectedDriver),
    [currentOperator, selectedDriver]
  );

  const allVehicles = useMemo(() => {
    const result: VehicleLive[] = [];
    operators.forEach((op) =>
      op.drivers.forEach((d) =>
        d.vehicles.forEach((v) => {
          const latest = vehicleMapRef.current.get(v._id);
          if (latest) result.push(latest);
        })
      )
    );
    return result;
  }, [operators, updateTrigger]);

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600 dark:text-gray-300">
          Loading live tracking data...
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Live Vehicle Tracking | VTS Admin" description="Real-time vehicle tracking" />
      <div>
        <PageBreadCrumb pageTitle="Live Tracking" />

        <OpenStreetMapLiveTracking
           vehicles={allVehicles}
  selectedVehicleId={selectedVehicle?._id}
  onVehicleSelect={(vehicleId) => {
    const vehicle = vehicleMapRef.current.get(vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      const meta = operatorMapRef.current.get(vehicleId);
      if (meta) {
        setSelectedOperator(meta.operatorId);
        setSelectedDriver(meta.driverId);
      }
    }
  }}
        />

        <DebugPanel />
      </div>
    </>
  );
}
