import { useState, useEffect } from "react";
import { alertsAPI } from "../../services/api";
import Label from "../form/Label";
import Button from "../ui/button/Button";

interface Alert {
  _id: string;
  alert_type: string;
  description: string;
  severity: string;
  is_active: boolean;
}

interface AlertFormProps {
  alert?: Alert;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AlertForm({ alert, onSuccess, onCancel }: AlertFormProps) {
  const [alertType, setAlertType] = useState("overspeed");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (alert) {
      setAlertType(alert.alert_type);
      setDescription(alert.description);
      setSeverity(alert.severity);
      setIsActive(alert.is_active);
    }
  }, [alert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    try {
      setLoading(true);
      let response;

      if (alert) {
        response = await alertsAPI.update(alert._id, {
          alert_type: alertType,
          description,
          severity,
          is_active: isActive,
        });
      } else {
        response = await alertsAPI.create({
          alert_type: alertType,
          description,
          severity,
          is_active: isActive,
        });
      }

      if (response.success) {
        onSuccess?.();
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
        <Label>Alert Type <span className="text-error-500">*</span></Label>
        <select
          value={alertType}
          onChange={(e) => setAlertType(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="overspeed">Over Speed</option>
          <option value="harsh_braking">Harsh Braking</option>
          <option value="harsh_acceleration">Harsh Acceleration</option>
          <option value="harsh_turn">Harsh Turn</option>
          <option value="geofence">Geofence Violation</option>
          <option value="maintenance">Maintenance Required</option>
          <option value="door_open">Door Open</option>
          <option value="engine_off">Engine Off</option>
        </select>
      </div>

      <div>
        <Label>Description <span className="text-error-500">*</span></Label>
        <textarea
          placeholder="Alert description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
        />
      </div>

      <div>
        <Label>Severity <span className="text-error-500">*</span></Label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={loading}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : alert ? "Update" : "Create"}
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
