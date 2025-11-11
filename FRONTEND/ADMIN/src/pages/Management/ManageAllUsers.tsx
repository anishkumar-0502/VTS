import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface Driver {
  user_id: string;
  name: string;
  email: string;
  phone_number: number;
  status: boolean;
  assigned_vehicle?: {
    vehicle_number: string;
    route_name: string;
  };
}

interface EndUser {
  user_id: string;
  name: string;
  email: string;
  phone_number: number;
  status: boolean;
  assigned_vehicle?: {
    vehicle_number: string;
    route_name: string;
  };
}

export default function ManageUsersTable() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [endUsers, setEndUsers] = useState<EndUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<"driver" | "endUser">("driver"); // ✅ Default: Driver table

  const isDark = document.documentElement.classList.contains("dark");

  const swalBaseConfig = {
    background: isDark ? "#1f2937" : "#ffffff",
    color: isDark ? "#e5e7eb" : "#111827",
    confirmButtonColor: isDark ? "#6366f1" : "#4f46e5",
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/users/list?type=all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch users");

      setDrivers(data.data.drivers || []);
      setEndUsers(data.data.end_users || []);
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading users...</p>
      </div>
    );

  // ✅ Common reusable table renderer
  const renderTable = (
    data: (Driver | EndUser)[],
    label: string
  ) => (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{label}</h2>
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {["Name", "Email", "Phone", "Vehicle", "Route", "Status"].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((u) => (
              <tr
                key={u.user_id}
                className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.phone_number}</td>
                <td className="px-3 py-2">{u.assigned_vehicle?.vehicle_number || "-"}</td>
                <td className="px-3 py-2">{u.assigned_vehicle?.route_name || "-"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.status
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {u.status ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
                No {label.toLowerCase()} found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageMeta title="Operator Users | Dashboard" description="List of operator users" />
      <div>
        <PageBreadCrumb pageTitle="Operator User Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-auto">
          {/* ✅ Dropdown for selecting user type */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select User Type
            </h2>
            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value === "driver" ? "driver" : "endUser")
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="driver">Driver</option>
              <option value="endUser">End User</option>
            </select>
          </div>

          {/* ✅ Conditional Rendering */}
          {selectedType === "driver"
            ? renderTable(drivers, "Drivers")
            : renderTable(endUsers, "End Users")}
        </div>
      </div>
    </>
  );
}
