import { useState, useEffect } from "react";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";

interface AssignDevice {
  _id?: string;
  device_id: string;
  operator_id: string;
  status: boolean;
}

interface AssignDeviceFormProps {
  assignment?: AssignDevice;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AssignDeviceForm({ assignment, onSuccess, onCancel }: AssignDeviceFormProps) {
  const [deviceId, setDeviceId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assignment) {
      setDeviceId(assignment.device_id);
      setOperatorId(assignment.operator_id);
      setStatus(assignment.status);
    }
  }, [assignment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      console.log("Assigned Device:", { deviceId, operatorId, status });
      setLoading(false);
      onSuccess?.();
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label>Device ID</Label>
        <Input
          type="text"
          placeholder="Enter Device ID"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <Label>Operator ID</Label>
        <Input
          type="text"
          placeholder="Enter Operator ID"
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
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
          {loading ? "Saving..." : assignment ? "Update Assignment" : "Assign Device"}
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
