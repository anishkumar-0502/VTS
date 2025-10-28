import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { vehiclesAPI } from "../../services/api";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

interface Vehicle {
  _id: string;
  vehicle_number: string;
  vehicle_type: string;
  model: string;
  status: boolean;
}

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSuccess?: (vehicle?: Vehicle) => void;
  onCancel?: () => void;
}

export default function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const { user } = useAuth();
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(vehicle.vehicle_number);
      setVehicleType(vehicle.vehicle_type);
      setModel(vehicle.model);
      setStatus(vehicle.status);
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!vehicleNumber.trim()) {
      setError("Vehicle number is required");
      return;
    }
    if (!model.trim()) {
      setError("Model is required");
      return;
    }

    try {
      setLoading(true);
      let response;

      if (vehicle) {
        response = await vehiclesAPI.update(vehicle._id, {
          vehicle_type: vehicleType,
          model,
          status,
        });
      } else {
        response = await vehiclesAPI.create({
          vehicle_number: vehicleNumber,
          vehicle_type: vehicleType,
          model,
          status,
          operator_id: user?.id,
        });
      }

      if (response.success) {
        const vehicleData = response.data as Vehicle | undefined;
        onSuccess?.(vehicleData);
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <Label>Vehicle Number <span className="text-error-500">*</span></Label>
        <Input
          type="text"
          placeholder="e.g., DL-01-AB-1234"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
          disabled={loading || !!vehicle}
        />
      </div>

      <div>
        <Label>Vehicle Type <span className="text-error-500">*</span></Label>
        <select
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="car">Car</option>
          <option value="truck">Truck</option>
          <option value="bus">Bus</option>
          <option value="auto">Auto</option>
          <option value="motorcycle">Motorcycle</option>
        </select>
      </div>

      <div>
        <Label>Model <span className="text-error-500">*</span></Label>
        <Input
          type="text"
          placeholder="e.g., Toyota Fortuner"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
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
          {loading ? "Saving..." : vehicle ? "Update" : "Create"}
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
  );
}
