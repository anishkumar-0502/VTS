import { useState, useEffect } from "react";
import { gpsAPI } from "../../services/api";

interface GPSDevice {
  _id: string;
  device_id: string;
  imei: string;
  sim_number: string;
  status: boolean;
  battery_level?: number;
  created_at: string;
}

interface GPSDevicesTableProps {
  onEdit?: (device: GPSDevice) => void;
  onDelete?: (deviceId: string) => void;
}

export default function GPSDevicesTable({ onEdit, onDelete }: GPSDevicesTableProps) {
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await gpsAPI.getDevices();
      if (response.success && response.data) {
        setDevices(response.data.devices || []);
      } else {
        setError(response.message || "Failed to fetch GPS devices");
      }
    } catch {
      setError("Error fetching GPS devices");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (window.confirm("Are you sure you want to delete this GPS device?")) {
      try {
        const response = await gpsAPI.deleteDevice(deviceId);
        if (response.success) {
          setDevices(devices.filter(d => d._id !== deviceId));
          if (onDelete) onDelete(deviceId);
        } else {
          setError(response.message || "Failed to delete device");
        }
      } catch {
        setError("Error deleting device");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading GPS devices...</div>;
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Device ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">IMEI</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">SIM Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Battery</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device._id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">{device.device_id}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{device.imei}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{device.sim_number || '-'}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full ${
                          (device.battery_level || 0) > 50
                            ? 'bg-green-500'
                            : (device.battery_level || 0) > 20
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${device.battery_level || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-10">{device.battery_level || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    device.status
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {device.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(device.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(device)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(device._id)}
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

      {devices.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No GPS devices found
        </div>
      )}
    </div>
  );
}
