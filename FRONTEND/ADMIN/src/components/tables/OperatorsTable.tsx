import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { operatorsAPI } from "../../services/api";
import Button from "../ui/button/Button";
import Swal from "sweetalert2";

export interface Operator {
  _id: string;
  full_name: string;
  email: string;
  phone_number: string;
  company_name: string;
  registration_number: string;
  city?: string;
  country?: string;
  status: boolean;
  created_at?: string;
}

export interface OperatorsTableRef {
  refresh: () => void;
}

interface OperatorsTableProps {
  onEdit: (operator: Operator) => void;
  onDelete: (id: string) => void;
  onView: (operator: Operator) => void;
}

const OperatorsTable = forwardRef<OperatorsTableRef, OperatorsTableProps>(
  ({ onEdit, onDelete, onView }, ref) => {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ✅ Fetch all operators
    const fetchOperators = async () => {
      try {
        setLoading(true);
        const response = await operatorsAPI.getAll();
        console.log("Operators API Response:", response);

        // Handle both array or { data: array }
        const operatorList = Array.isArray(response)
          ? response
          : response?.data || [];

        if (operatorList.length > 0) {
          setOperators(operatorList);
          setError("");
        } else {
          setOperators([]);
          setError("No operators found.");
        }
      } catch (err) {
        console.error("Error fetching operators:", err);
        setError("Failed to load operators.");
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: fetchOperators,
    }));

    useEffect(() => {
      fetchOperators();
    }, []);

    // ✅ Handle Delete with Confirmation
    const handleDelete = async (id: string) => {
      Swal.fire({
        title: "Are you sure?",
        text: "This will permanently delete the operator.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await onDelete(id);
            fetchOperators();
            Swal.fire("Deleted!", "Operator has been deleted.", "success");
          } catch (error) {
            Swal.fire("Error!", "Failed to delete operator.", "error");
          }
        }
      });
    };

    // ✅ Loading / Error States
    if (loading) {
      return (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          Loading operators...
        </div>
      );
    }

    if (error && operators.length === 0) {
      return (
        <div className="text-center py-10 text-red-500 dark:text-red-400">
          {error}
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Reg. No.</th>
                <th className="px-4 py-2 text-left">City</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {operators.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-4 text-gray-500 dark:text-gray-400"
                  >
                    {error || "No operators found"}
                  </td>
                </tr>
              ) : (
                operators.map((op) => (
                  <tr
                    key={op._id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <td className="px-4 py-2">{op.full_name}</td>
                    <td className="px-4 py-2">{op.email}</td>
                    <td className="px-4 py-2">{op.phone_number}</td>
                    <td className="px-4 py-2">{op.company_name}</td>
                    <td className="px-4 py-2">
                      {op.registration_number || "-"}
                    </td>
                    <td className="px-4 py-2">{op.city || "-"}</td>
                    <td className="px-4 py-2">{op.country || "-"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          op.status
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {op.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {op.created_at
                        ? new Date(op.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-2 flex gap-2 justify-center">
                      <Button
                        onClick={() => onView(op)}
                        className="!px-3 !py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => onEdit(op)}
                        className="!px-3 !py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(op._id)}
                        className="!px-3 !py-1 text-xs bg-red-500 hover:bg-red-600 text-white"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

OperatorsTable.displayName = "OperatorsTable";

export default OperatorsTable;
