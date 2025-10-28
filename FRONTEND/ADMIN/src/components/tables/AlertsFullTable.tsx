import { useState, useEffect } from "react";
import { alertsAPI } from "../../services/api";

interface Alert {
  _id: string;
  vehicle_id?: string;
  alert_type: string;
  description: string;
  severity: string;
  isActive: boolean;
  created_at: string;
}

interface AlertsFullTableProps {
  onEdit?: (alert: Alert) => void;
  onDelete?: (alertId: string) => void;
}

export default function AlertsFullTable({ onEdit, onDelete }: AlertsFullTableProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertsAPI.getAll();
      if (response.success && response.data) {
        setAlerts(response.data.alerts || []);
      } else {
        setError(response.message || "Failed to fetch alerts");
      }
    } catch {
      setError("Error fetching alerts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (window.confirm("Are you sure you want to delete this alert?")) {
      try {
        const response = await alertsAPI.delete(alertId);
        if (response.success) {
          setAlerts(alerts.filter(a => a._id !== alertId));
          if (onDelete) onDelete(alertId);
        } else {
          setError(response.message || "Failed to delete alert");
        }
      } catch {
        setError("Error deleting alert");
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return alert.isActive;
    if (filter === 'inactive') return !alert.isActive;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-brand-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'active'
              ? 'bg-brand-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'inactive'
              ? 'bg-brand-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300'
          }`}
        >
          Inactive
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert) => (
              <tr key={alert._id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300 capitalize">{alert.alert_type}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{alert.description}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    alert.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {alert.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(alert.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(alert)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(alert._id)}
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

      {filteredAlerts.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No alerts found
        </div>
      )}
    </div>
  );
}
