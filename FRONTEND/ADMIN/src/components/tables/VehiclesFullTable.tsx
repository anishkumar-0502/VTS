import { useState, useEffect } from "react";
import { vehiclesAPI } from "../../services/api";

interface Vehicle {
  _id: string;
  vehicle_number: string;
  vehicle_type: string;
  model: string;
  status: boolean;
  created_at: string;
}

interface VehiclesFullTableProps {
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicleId: string) => void;
}

export default function VehiclesFullTable({ onEdit, onDelete }: VehiclesFullTableProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll();
      if (response.success && response.data) {
        setVehicles(response.data.vehicles || []);
      } else {
        setError(response.message || "Failed to fetch vehicles");
      }
    } catch {
      setError("Error fetching vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      try {
        const response = await vehiclesAPI.delete(vehicleId);
        if (response.success) {
          setVehicles(vehicles.filter(v => v._id !== vehicleId));
          if (onDelete) onDelete(vehicleId);
        } else {
          setError(response.message || "Failed to delete vehicle");
        }
      } catch {
        setError("Error deleting vehicle");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading vehicles...</div>;
  }

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Vehicle Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Model</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle._id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">{vehicle.vehicle_number}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{vehicle.vehicle_type}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{vehicle.model}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    vehicle.status
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {vehicle.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(vehicle.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(vehicle)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle._id)}
                      className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vehicles.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No vehicles found
        </div>
      )}
    </div>
  );
}
