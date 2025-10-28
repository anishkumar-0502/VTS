import { useState, useEffect } from "react";
import { usersAPI } from "../../services/api";

interface Operator {
  _id: string;
  full_name: string;
  email: string;
  status: boolean;
  created_at: string;
}

interface OperatorsTableProps {
  onEdit?: (operator: Operator) => void;
  onDelete?: (operatorId: string) => void;
}

export default function OperatorsTable({ onEdit, onDelete }: OperatorsTableProps) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      if (response.success && response.data) {
        setOperators(response.data.operators || []);
      } else {
        setError(response.message || "Failed to fetch operators");
      }
    } catch {
      setError("Error fetching operators");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (operatorId: string) => {
    if (window.confirm("Are you sure you want to delete this operator?")) {
      try {
        const response = await usersAPI.delete(operatorId);
        if (response.success) {
          setOperators(operators.filter(op => op._id !== operatorId));
          if (onDelete) onDelete(operatorId);
        } else {
          setError(response.message || "Failed to delete operator");
        }
      } catch {
        setError("Error deleting operator");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading operators...</div>;
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((operator) => (
              <tr key={operator._id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-4 text-sm text-gray-800 dark:text-gray-300">{operator.full_name}</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{operator.email}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    operator.status
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {operator.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(operator.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(operator)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(operator._id)}
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

      {operators.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No operators found
        </div>
      )}
    </div>
  );
}
