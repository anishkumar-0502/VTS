import { useState, useEffect } from "react";
import { usersAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Checkbox from "../form/input/Checkbox";

interface Operator {
  _id: string;
  full_name: string;
  email: string;
  status: boolean;
}

interface OperatorFormProps {
  operator?: Operator;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OperatorForm({ operator, onSuccess, onCancel }: OperatorFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (operator) {
      setName(operator.full_name);
      setEmail(operator.email);
      setStatus(operator.status);
    }
  }, [operator]);

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
    if (!operator && !password) {
      setError("Password is required for new operator");
      return;
    }

    try {
      setLoading(true);
      let response;
      
      if (operator) {
        response = await usersAPI.update(operator._id, {
          name,
          status,
        });
      } else {
        response = await usersAPI.create({
          name,
          email,
          password,
          status,
          superadmin_id: user?.id,
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
          placeholder="Operator name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <Label>Email <span className="text-error-500">*</span></Label>
        <Input
          type="email"
          placeholder="operator@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || !!operator}
        />
      </div>

      {!operator && (
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
        <Checkbox
          checked={status}
          onChange={setStatus}
          disabled={loading}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : operator ? "Update" : "Create"}
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
