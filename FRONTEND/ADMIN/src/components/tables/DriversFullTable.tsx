import { useState, useEffect } from "react";
import { driversAPI } from "../../services/api";

interface Driver {
  _id: string;
  full_name: string;
  email: string;
  phone_number: string;
  status: boolean;
  created_at: string;
}

interface DriversFullTableProps {
  onEdit?: (driver: Driver) => void;
  onDelete?: (driverId: string) => void;
}

export default function DriversFullTable({ onEdit, onDelete }: DriversFullTableProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await driversAPI.getAll();
      if (response.success && response.data) {
        setDrivers(response.data.drivers || []);
      } else {
        setError(response.message || "Failed to fetch drivers");
      }
    } catch {
      setError("Error fetching drivers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        const response = await driversAPI.delete(driverId);
        if (response.success) {
          setDrivers(drivers.filter(d => d._id !== driverId));
          if (onDelete) onDelete(driverId);
        } else {
          setError(response.message || "Failed to delete driver");
        }
      } catch {
        setError("Error deleting driver");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading drivers...</div>;
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver._id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">{driver.full_name}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{driver.email}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{driver.phone_number}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    driver.status
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {driver.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(driver.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(driver)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(driver._id)}
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

      {drivers.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No drivers found
        </div>
      )}
    </div>
  );
}
