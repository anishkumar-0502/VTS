import { useState, useEffect } from "react";
import { driversAPI } from "../../services/api";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone_number: string;
  status: boolean;
}

interface DriverFormProps {
  driver?: Driver;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DriverForm({ driver, onSuccess, onCancel }: DriverFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setEmail(driver.email);
      setPhoneNumber(driver.phone_number);
      setStatus(driver.status);
    }
  }, [driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!driver && !password) {
      setError("Password is required for new driver");
      return;
    }

    try {
      setLoading(true);
      let response;

      if (driver) {
        response = await driversAPI.update(driver._id, {
          name,
          phone_number: phoneNumber,
          status,
        });
      } else {
        response = await driversAPI.create({
          name,
          email,
          phone_number: phoneNumber,
          password,
          status,
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
        <Label>Name <span className="text-error-500">*</span></Label>
        <Input
          type="text"
          placeholder="Driver name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <Label>Email <span className="text-error-500">*</span></Label>
        <Input
          type="email"
          placeholder="driver@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || !!driver}
        />
      </div>

      <div>
        <Label>Phone Number <span className="text-error-500">*</span></Label>
        <Input
          type="tel"
          placeholder="e.g., +91-9876543210"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={loading}
        />
      </div>

      {!driver && (
        <div>
          <Label>Password <span className="text-error-500">*</span></Label>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

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
          {loading ? "Saving..." : driver ? "Update" : "Create"}
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
