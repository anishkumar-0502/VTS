import { useState, useEffect, useCallback } from "react";
import { gpsDevicesAPI, vehiclesAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../hooks/useModal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import VehicleForm from "./VehicleForm";

interface GPSDevice {
  _id: string;
  device_id?: string;
  vehicle_id?: string;
  imei: string;
  sim_number: string;
  status: boolean;
  battery_level?: number;
}

interface VehicleOption {
  _id: string;
  vehicle_number: string;
  model?: string;
}

interface GPSDeviceFormProps {
  device?: GPSDevice;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function GPSDeviceForm({ device, onSuccess, onCancel }: GPSDeviceFormProps) {
  const { user } = useAuth();
  const [imei, setImei] = useState("");
  const [simNumber, setSimNumber] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleSelection, setVehicleSelection] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const { isOpen: isVehicleModalOpen, openModal: openVehicleModal, closeModal: closeVehicleModal } = useModal();

  const loadVehicles = useCallback(async () => {
    try {
      setLoadingVehicles(true);
      const response = await vehiclesAPI.getAll();
      if (response.success && response.data?.vehicles) {
        setVehicles(response.data.vehicles);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    if (device) {
      setImei(device.imei);
      setSimNumber(device.sim_number);
      setStatus(device.status);
      setVehicleId(device.vehicle_id || "");
      setVehicleSelection(device.vehicle_id || "");
    }
  }, [device]);

  const handleVehicleAdded = useCallback(
    (newVehicle?: any) => {
      if (newVehicle && newVehicle._id) {
        setVehicles((prev) => {
          const exists = prev.some((vehicle) => vehicle._id === newVehicle._id);
          if (exists) {
            return prev.map((vehicle) =>
              vehicle._id === newVehicle._id ? { ...vehicle, ...newVehicle } : vehicle
            );
          }
          return [...prev, newVehicle];
        });
        setVehicleSelection(newVehicle._id);
        setVehicleId(newVehicle._id);
      } else {
        loadVehicles();
      }
      closeVehicleModal();
    },
    [closeVehicleModal, loadVehicles]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!imei.trim()) {
      setError("IMEI is required");
      return;
    }
    if (imei.length !== 15) {
      setError("IMEI must be 15 digits");
      return;
    }
    if (!simNumber.trim()) {
      setError("SIM number is required");
      return;
    }

    try {
      setLoading(true);
      let response;

      if (device) {
        response = await gpsDevicesAPI.update(device._id, {
          status,
        });
      } else {
        response = await gpsDevicesAPI.create({
          operator_id: user?.operator_id || user?.id,
          vehicle_id: vehicleSelection === "assign" ? vehicleId : undefined,
          imei,
          sim_number: simNumber,
          status,
        });
      }

      if (response.success) {
        if (!device && response.data?.device_id) {
          setDeviceId(response.data.device_id);
        }
        onSuccess?.();
        if (!device) {
          setVehicleSelection("");
          setVehicleId("");
          setImei("");
          setSimNumber("");
          setStatus(true);
          loadVehicles();
        }
      } else {
        setError(response.message || "Operation failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isVehicleModalOpen} onClose={closeVehicleModal} className="max-w-[600px] m-4">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Vehicle</h3>
            <Button size="sm" variant="outline" onClick={closeVehicleModal}>
              Close
            </Button>
          </div>
          <VehicleForm onSuccess={handleVehicleAdded} onCancel={closeVehicleModal} />
        </div>
      </Modal>

      <form onSubmit={handleSubmit} className="space-y-5">
        {deviceId && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-green-600 dark:text-green-400">
              Device created successfully! Device ID: <strong>{deviceId}</strong>
            </p>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!device && (
          <div>
            <Label>Vehicle <span className="text-error-500">*</span></Label>
            <div className="flex items-center gap-3">
              <select
                value={vehicleSelection}
                onChange={(e) => {
                  const value = e.target.value;
                  setVehicleSelection(value);
                  if (!value || value === "other") {
                    setVehicleId("");
                  } else {
                    setVehicleId(value);
                  }
                }}
                disabled={loading || loadingVehicles}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">{loadingVehicles ? "Loading vehicles..." : "Select a vehicle"}</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicle_number} {v.model ? `- ${v.model}` : ""}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
              {vehicleSelection === "other" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openVehicleModal}
                >
                  Add Vehicle
                </Button>
              )}
            </div>
            {!loadingVehicles && vehicles.length === 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                No vehicles available. Add a new vehicle to continue.
              </p>
            )}
          </div>
        )}

        <div>
        <Label>IMEI <span className="text-error-500">*</span></Label>
        <Input
          type="text"
          placeholder="15 digit IMEI number"
          value={imei}
          onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
          disabled={loading || !!device}
          maxLength={15}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{imei.length}/15 digits</p>
      </div>

      <div>
        <Label>SIM Number <span className="text-error-500">*</span></Label>
        <Input
          type="text"
          placeholder="e.g., 9876543210"
          value={simNumber}
          onChange={(e) => setSimNumber(e.target.value)}
          disabled={loading || !!device}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={status}
          onChange={(e) => setStatus(e.target.checked)}
          disabled={loading}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : device ? "Update" : "Register"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 transition rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  </>
  );
}
