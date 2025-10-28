import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { vehiclesAPI } from "../../services/api";
import { socketService, type LocationUpdateData } from "../../services/socket";
import OpenStreetMapLiveTracking from "../../components/OpenStreetMapLiveTracking";
import DebugPanel from "../../components/DebugPanel";

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

export default function LiveTracking() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLive | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const vehicleMapRef = useRef<Map<string, VehicleLive>>(new Map());
  const operatorMapRef = useRef<Map<string, { name: string; driverId: string; operatorId: string }>>(new Map());
  
  const [operatorSearch, setOperatorSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [speedHistory, setSpeedHistory] = useState<SpeedHistory[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleLocationUpdateRef = useRef<((data: LocationUpdateData) => void) | undefined>(undefined);
  const listenersRegisteredRef = useRef(false);

  const handleLocationUpdate = useCallback((data: LocationUpdateData) => {
    console.log('🗺️ Location update:', {
      vehicle: data.vehicleId,
      speed: data.speed,
      lat: (data.latitude ?? 0).toFixed(4),
      lng: (data.longitude ?? 0).toFixed(4),
    });

    const vehicleMap = vehicleMapRef.current;
    const existingVehicle = vehicleMap.get(data.vehicleId);

    const updatedVehicle: VehicleLive = {
      _id: data.vehicleId,
      vehicle_number: existingVehicle?.vehicle_number || '',
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      course: data.course || 0,
      timestamp: data.timestamp,
      device: data.device ? {
        id: data.gpsDeviceId,
        status: data.device.status,
        battery_level: data.device.battery_level,
        last_signal: data.device.last_signal
      } : existingVehicle?.device
    };

    vehicleMap.set(data.vehicleId, updatedVehicle);

    if (selectedVehicle?._id === data.vehicleId) {
      setSelectedVehicle(updatedVehicle);
      setSpeedHistory(prev => {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), speed: data.speed }];
        return newHistory.slice(-20);
      });
    }

    setUpdateTrigger(t => t + 1);
  }, [selectedVehicle?._id]);

  useEffect(() => {
    handleLocationUpdateRef.current = handleLocationUpdate;
  }, [handleLocationUpdate]);

  useEffect(() => {
    fetchVehicles();
    socketService.connect();

    if (!listenersRegisteredRef.current) {
      listenersRegisteredRef.current = true;

      socketService.on('connected', () => {
        console.log('🔌 Socket connected');
        socketService.joinAdmin();
        setSocketConnected(true);
      });

      socketService.on('disconnected', () => {
        console.log('🔌 Socket disconnected');
        setSocketConnected(false);
      });

      socketService.on('location_update', (data: unknown) => {
        handleLocationUpdateRef.current?.(data as LocationUpdateData);
      });

      socketService.on('error', (err: unknown) => {
        console.error('🐛 Socket error:', err);
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll();
      
      if (response.success && response.data?.vehicles) {
        const operatorsMap = new Map<string, Operator>();
        const vehicleMetaMap = new Map<string, { name: string; driverId: string; operatorId: string }>();

        response.data.vehicles.forEach((v: Record<string, unknown>) => {
          const operatorId = (v.operator_id as string) || 'unassigned';
          const driverId = (v.driver_id as string) || 'unassigned';
          const operatorName = (v.operator_name as string) || `Operator ${operatorId.substring(0, 8)}`;
          const driverName = (v.driver_name as string) || `Driver ${driverId.substring(0, 8)}`;
          const vehicleId = (v._id as string);
          const vehicleNumber = (v.vehicle_number as string);
          const latitude = (v.latitude as number) || 0;
          const longitude = (v.longitude as number) || 0;
          const speed = (v.speed as number) || 0;
          const course = (v.course as number) || 0;
          const timestamp = (v.timestamp as string) || new Date().toISOString();
          const deviceData = v.device as Record<string, unknown> | undefined;

          if (!operatorsMap.has(operatorId)) {
            operatorsMap.set(operatorId, {
              _id: operatorId,
              name: operatorName,
              drivers: []
            });
          }

          const operator = operatorsMap.get(operatorId)!;
          let driver = operator.drivers.find(d => d._id === driverId);

          if (!driver) {
            driver = {
              _id: driverId,
              name: driverName,
              vehicles: []
            };
            operator.drivers.push(driver);
          }

          const vehicleLive: VehicleLive = {
            _id: vehicleId,
            vehicle_number: vehicleNumber,
            latitude,
            longitude,
            speed,
            course,
            timestamp,
            device: deviceData ? {
              id: (deviceData.id as string),
              status: (deviceData.status as boolean) || false,
              battery_level: (deviceData.battery_level as number) || undefined,
              last_signal: (deviceData.last_signal as string) || undefined
            } : undefined
          };

          vehicleMetaMap.set(vehicleId, { name: vehicleNumber, driverId, operatorId });
          vehicleMapRef.current.set(vehicleId, vehicleLive);
          driver.vehicles.push(vehicleLive);
        });

        operatorMapRef.current = vehicleMetaMap;
        setOperators(Array.from(operatorsMap.values()));
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOperatorStats = (operator: Operator) => {
    let totalVehicles = 0;
    let activeVehicles = 0;

    operator.drivers.forEach(driver => {
      totalVehicles += driver.vehicles.length;
      activeVehicles += driver.vehicles.filter(v => {
        const latest = vehicleMapRef.current.get(v._id);
        return latest?.device?.status;
      }).length;
    });

    return { totalVehicles, activeVehicles };
  };

  const getDriverStats = (driver: Driver) => {
    const totalVehicles = driver.vehicles.length;
    const activeVehicles = driver.vehicles.filter(v => {
      const latest = vehicleMapRef.current.get(v._id);
      return latest?.device?.status;
    }).length;
    return { totalVehicles, activeVehicles };
  };

  const getSpeedColor = (speed: number | null) => {
    const speedValue = speed ?? 0;
    if (speedValue === 0) return 'text-gray-600 dark:text-gray-400';
    if (speedValue < 30) return 'text-green-600 dark:text-green-400';
    if (speedValue < 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const currentOperator = useMemo(() => 
    operators.find(o => o._id === selectedOperator), 
    [operators, selectedOperator]
  );
  
  const currentDriver = useMemo(() => 
    currentOperator?.drivers.find(d => d._id === selectedDriver), 
    [currentOperator, selectedDriver]
  );

  const allVehicles = useMemo(() => {
    const result: VehicleLive[] = [];
    operators.forEach(o => {
      o.drivers.forEach(d => {
        d.vehicles.forEach(v => {
          const latest = vehicleMapRef.current.get(v._id);
          if (latest) {
            result.push(latest);
          }
        });
      });
    });
    return result;
  }, [operators, updateTrigger]);

  const filteredOperators = useMemo(() =>
    operators.filter(op =>
      op.name.toLowerCase().includes(operatorSearch.toLowerCase())
    ),
    [operators, operatorSearch]
  );

  const filteredDrivers = useMemo(() =>
    currentOperator?.drivers.filter(drv =>
      drv.name.toLowerCase().includes(driverSearch.toLowerCase())
    ) || [],
    [currentOperator, driverSearch]
  );

  const filteredVehicles = useMemo(() => {
    if (!currentDriver) return [];
    return currentDriver.vehicles
      .map(v => vehicleMapRef.current.get(v._id) || v)
      .filter(v => v.vehicle_number.toLowerCase().includes(vehicleSearch.toLowerCase()));
  }, [currentDriver, vehicleSearch, updateTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading live tracking data...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Live Vehicle Tracking | VTS Admin"
        description="Real-time tracking with hierarchical view"
      />
      <div>
        <PageBreadCrumb pageTitle="Live Tracking" />

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
                Live Map View
              </h2>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                socketConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs font-medium">
                  {socketConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>

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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                👥 Operators ({filteredOperators.length})
              </h3>
              <input
                type="text"
                placeholder="Search operators..."
                value={operatorSearch}
                onChange={(e) => setOperatorSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredOperators.map(operator => {
                const stats = getOperatorStats(operator);
                const isSelected = selectedOperator === operator._id;
                return (
                  <div
                    key={operator._id}
                    onClick={() => {
                      setSelectedOperator(operator._id);
                      setSelectedDriver(null);
                      setSelectedVehicle(null);
                      setOperatorSearch("");
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-900/20'
                        : 'bg-gray-50 border border-gray-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {operator.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {stats.activeVehicles}/{stats.totalVehicles} active
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                👨‍✈️ Drivers ({filteredDrivers.length})
              </h3>
              <input
                type="text"
                placeholder="Search drivers..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                disabled={!currentOperator}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3 disabled:opacity-50"
              />
            </div>
            {currentOperator ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDrivers.map(driver => {
                  const stats = getDriverStats(driver);
                  const isSelected = selectedDriver === driver._id;
                  return (
                    <div
                      key={driver._id}
                      onClick={() => {
                        setSelectedDriver(driver._id);
                        setSelectedVehicle(null);
                        setDriverSearch("");
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-900/20'
                          : 'bg-gray-50 border border-gray-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {driver.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {stats.activeVehicles}/{stats.totalVehicles} vehicles
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-4">
                Select an operator first
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                🚗 Vehicles ({filteredVehicles.length})
              </h3>
              <input
                type="text"
                placeholder="Search vehicles..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                disabled={!currentDriver}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3 disabled:opacity-50"
              />
            </div>
            {currentDriver ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredVehicles.map(vehicle => (
                  <div
                    key={vehicle._id}
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setVehicleSearch("");
                      setSpeedHistory([{ time: new Date().toLocaleTimeString(), speed: vehicle.speed ?? 0 }]);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedVehicle?._id === vehicle._id
                        ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-900/20'
                        : 'bg-gray-50 border border-gray-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {vehicle.vehicle_number}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${vehicle.device?.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {vehicle.device?.status ? 'Connected' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${getSpeedColor(vehicle.speed)}`}>
                          {(vehicle.speed ?? 0).toFixed(0)} km/h
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-4">
                Select a driver first
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              📱 Device Details & Live Statistics
            </h3>
            {selectedVehicle && currentOperator && currentDriver ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Operator</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {currentOperator.name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Driver</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {currentDriver.name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Vehicle</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedVehicle.vehicle_number}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Last Update</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {new Date(selectedVehicle.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Location (Lat/Lng)</div>
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                      {(selectedVehicle.latitude ?? 0).toFixed(6)}<br/>
                      {(selectedVehicle.longitude ?? 0).toFixed(6)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Current Speed</div>
                    <div className={`font-semibold text-lg ${getSpeedColor(selectedVehicle.speed)}`}>
                      {(selectedVehicle.speed ?? 0).toFixed(1)} km/h
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Course</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">
                      {(selectedVehicle.course ?? 0).toFixed(1)}°
                    </div>
                  </div>
                  {selectedVehicle.device?.battery_level != null && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Battery</div>
                      <div className="font-semibold text-gray-900 dark:text-white text-lg">
                        🔋 {(selectedVehicle.device.battery_level ?? 0).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Device Status</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedVehicle.device?.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selectedVehicle.device?.status ? '🟢 Connected' : '🔴 Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {speedHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      📊 Live Speed Analytics (Last 20 Updates)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                        <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Average Speed</div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {(speedHistory.reduce((sum, h) => sum + (h.speed ?? 0), 0) / speedHistory.length).toFixed(1)} km/h
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Max Speed</div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {(speedHistory.length > 0 ? Math.max(...speedHistory.map(h => h.speed ?? 0)) : 0).toFixed(1)} km/h
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Min Speed</div>
                        <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                          {(speedHistory.length > 0 ? Math.min(...speedHistory.map(h => h.speed ?? 0)) : 0).toFixed(1)} km/h
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-40 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {speedHistory.map((history, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>{history.time}</span>
                          <span className={`font-semibold ${getSpeedColor(history.speed)}`}>
                            {(history.speed ?? 0).toFixed(1)} km/h
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select operator, driver, and vehicle to view live device details and analytics
              </div>
            )}
          </div>
        </div>
      </div>

      <DebugPanel />
    </>
  );
}
