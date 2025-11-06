import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface Operator {
  operator_id: string;
  name: string;
}

interface Device {
  device_id: string;
}

interface AssignedDevice {
  device_id: string;
  operator_id: string;
  assigned_at?: string;
  status?: boolean;
}

export default function AssignDeviceToOperator() {
  const [showForm, setShowForm] = useState(false);
  const [assignments, setAssignments] = useState<AssignedDevice[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [formData, setFormData] = useState({ device_id: "", operator_id: "" });
  const [loading, setLoading] = useState(false);
  const didFetch = useRef(false);

  /** Fetch operator list */
  const fetchOperators = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/operators/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) setOperators(data.data);
    } catch {
      Swal.fire("Error", "Failed to load operators", "error");
    }
  };

  /** Fetch device list */
  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/devices/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) setDevices(data.data);
    } catch {
      Swal.fire("Error", "Failed to load devices", "error");
    }
  };

  /** Load data once */
  useEffect(() => {
    if (didFetch.current) return;
    fetchOperators();
    fetchDevices();
    didFetch.current = true;
  }, []);

  /** Submit new assignment */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.device_id || !formData.operator_id) {
      Swal.fire("Validation", "Please select both a device and an operator", "warning");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${BASE_URL}/superadmin/assignments/device-to-operator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.message || "Failed to assign device");

      Swal.fire("Success", "Device assigned successfully!", "success");
      setAssignments([
        ...assignments,
        {
          ...formData,
          assigned_at: new Date().toISOString(),
          status: true,
        },
      ]);
      setFormData({ device_id: "", operator_id: "" });
      setShowForm(false);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Assignment failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Assign Device to Operator | VTS Admin"
        description="Assign and manage devices for operators"
      />
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
        <PageBreadCrumb pageTitle="Assign Device to Operator" />

        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md p-8 transition">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Device Assignments
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-5 py-2 rounded-lg font-medium text-white transition ${
                showForm
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {showForm ? "Close Form" : "+ New Assignment"}
            </button>
          </div>

          {/* Assignment Form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-6 border border-indigo-100 dark:border-gray-600 rounded-xl shadow-sm"
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Assign New Device
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Operator
                  </label>
                  <select
                    value={formData.operator_id}
                    onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                    className="w-full border border-indigo-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Select Operator --</option>
                    {operators.map((op) => (
                      <option key={op.operator_id} value={op.operator_id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Device (by ID)
                  </label>
                  <select
                    value={formData.device_id}
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    className="w-full border border-indigo-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Select Device ID --</option>
                    {devices.map((d) => (
                      <option key={d.device_id} value={d.device_id}>
                        {d.device_id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition"
                >
                  {loading ? "Assigning..." : "Assign Device"}
                </button>
              </div>
            </form>
          )}

          {/* Assignment Table */}
          {assignments.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10 italic">
              No assignments added yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
              <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-200">
                <thead className="bg-indigo-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Device ID</th>
                    <th className="px-4 py-3 font-semibold">Operator ID</th>
                    <th className="px-4 py-3 font-semibold">Assigned At</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <td className="px-4 py-3">{a.device_id}</td>
                      <td className="px-4 py-3">{a.operator_id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {a.assigned_at
                          ? new Date(a.assigned_at).toLocaleString()
                          : "Just now"}
                      </td>
                      <td className="px-4 py-3">
                        {a.status ? (
                          <span className="px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-full">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
