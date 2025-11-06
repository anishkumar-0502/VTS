import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface Operator {
  operator_id: string;
  name: string;
  email: string;
  phone: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  status: boolean;
}

interface Device {
  device_id: string;
  device_name: string;
}

export default function ManageOperators() {
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  const isDark = document.documentElement.classList.contains("dark");

  const swalBaseConfig = {
    background: isDark ? "#1f2937" : "#ffffff",
    color: isDark ? "#e5e7eb" : "#111827",
    confirmButtonColor: isDark ? "#6366f1" : "#4f46e5",
  };

  // Fetch operators
  const fetchOperators = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/operators/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) setOperators(data.data);
      else throw new Error(data.message || "Failed to fetch operators");
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/devices/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) setDevices(data.data);
      else throw new Error(data.message || "Failed to fetch devices");
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  useEffect(() => {
    fetchOperators();
    fetchDevices();
  }, []);

  // Create / Update
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const token = localStorage.getItem("token");
      const url = editingOperator
        ? `${BASE_URL}/superadmin/operators/${editingOperator.operator_id}/update`
        : `${BASE_URL}/superadmin/operators/create`;
      const method = editingOperator ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        ...swalBaseConfig,
        icon: "success",
        title: editingOperator ? "Operator updated successfully!" : "Operator created successfully!",
      });

      setShowForm(false);
      setEditingOperator(null);
      fetchOperators();
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  // Toggle status
  const toggleStatus = async (operator_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/operators/${operator_id}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        ...swalBaseConfig,
        icon: "success",
        title: "Operator status updated successfully!",
      });
      fetchOperators();
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  // Assign device
// Assign or Unassign Device
const assignDevice = async (operator_id: string, device_id: string) => {
  if (!device_id) return;

  const token = localStorage.getItem("token");

  // Ask for assign or unassign confirmation
  const { isConfirmed } = await Swal.fire({
    ...swalBaseConfig,
    icon: "question",
    title: "Assign Device?",
    text: "Do you want to assign this device to the operator?",
    showCancelButton: true,
    confirmButtonText: "Yes, Assign",
    cancelButtonText: "Cancel",
  });

  if (!isConfirmed) return;

  try {
    const res = await fetch(`${BASE_URL}/superadmin/assignments/device-to-operator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        device_id,
        operator_id,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to assign device");

    Swal.fire({
      ...swalBaseConfig,
      icon: "success",
      title: "Device assigned successfully!",
    });

    fetchOperators();
  } catch (err: any) {
    Swal.fire({
      ...swalBaseConfig,
      icon: "error",
      title: "Error",
      text: err.message,
    });
  }
};

// Optional: Unassign Device
const unassignDevice = async (operator_id: string, device_id: string) => {
  const token = localStorage.getItem("token");

  const { isConfirmed } = await Swal.fire({
    ...swalBaseConfig,
    icon: "warning",
    title: "Unassign Device?",
    text: "Do you want to unassign this device from the operator?",
    showCancelButton: true,
    confirmButtonText: "Yes, Unassign",
    cancelButtonText: "Cancel",
  });

  if (!isConfirmed) return;

  try {
    const res = await fetch(`${BASE_URL}/superadmin/assignments/unassign-device-from-operator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        device_id,
        operator_id,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to unassign device");

    Swal.fire({
      ...swalBaseConfig,
      icon: "success",
      title: "Device unassigned successfully!",
    });

    fetchOperators();
  } catch (err: any) {
    Swal.fire({
      ...swalBaseConfig,
      icon: "error",
      title: "Error",
      text: err.message,
    });
  }
};


  // View operator details
  const handleView = async (operator_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/operators/${operator_id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const o = data.data;

      Swal.fire({
        ...swalBaseConfig,
        title: `<h3 style="font-size:16px; font-weight:600; margin-bottom:8px;">Operator Details</h3>`,
        html: `
          <div style="text-align:left; font-size:14px; line-height:1.6;">
            <p><b>Name:</b> ${o.name}</p>
            <p><b>Email:</b> ${o.email}</p>
            <p><b>Phone:</b> ${o.phone}</p>
            <p><b>Registration #:</b> ${o.registration_number}</p>
            <p><b>Address:</b> ${o.address}, ${o.city}, ${o.state}</p>
            <p><b>Postal:</b> ${o.postal_code}</p>
            <p><b>Country:</b> ${o.country}</p>
            <hr style="margin:10px 0;border:none;border-top:1px solid ${
              isDark ? "#374151" : "#e5e7eb"
            };"/>
            <p><b>Status:</b> ${
              o.status
                ? '<span style="color:#10b981;font-weight:600;">Active</span>'
                : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
            }</p>
            <p><b>Created:</b> ${new Date(o.createdAt).toLocaleString()}</p>
            <p><b>Updated:</b> ${new Date(o.updatedAt).toLocaleString()}</p>
          </div>`,
        confirmButtonText: "Close",
        width: 420,
        customClass: { popup: "rounded-xl shadow-lg" },
      });
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading operators...</p>
      </div>
    );

  return (
    <>
      <PageMeta title="Operator Management | Superadmin" description="Manage all operators" />
      <div className="overflow-x-hidden"> {/* ✅ prevents full page scroll horizontally */}
        <PageBreadCrumb pageTitle="Operator Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Operators
            </h2>

            <Button
              size="sm"
              onClick={() => {
                setEditingOperator(null);
                setShowForm(true);
              }}
            >
              + Add Operator
            </Button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingOperator ? "Edit Operator" : "Add New Operator"}
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "name",
                  "email",
                  "phone",
                  "registration_number",
                  "address",
                  "city",
                  "state",
                  "postal_code",
                  "country",
                ].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {field.replace("_", " ")}
                    </label>
                    <input
                      name={field}
                      type={field === "email" ? "email" : "text"}
                      defaultValue={(editingOperator as any)?.[field] || ""}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}

                <div className="col-span-full flex justify-end gap-3 mt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEditingOperator(null);
                    }}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button size="sm" type="submit">
                    {editingOperator ? "Update Operator" : "Create Operator"}
                  </Button>
                </div>
              </form>
            </div>
          )}

         
<div className="relative w-full overflow-hidden">
  <div className="max-h-[400px] max-w-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none]">
    <style>
      {`
        /* Hide scrollbar for Chrome, Safari, and Edge */
        div::-webkit-scrollbar {
          display: none;
        }
      `}
    </style>
        <style dangerouslySetInnerHTML={{
      __html: `
        .dark select option {
          background-color: rgb(55 65 81) !important;
          color: white !important;
        }
      `
    }} />


    <table className="min-w-[900px] w-full border-collapse table-fixed">
      <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
        <tr className="border-b border-gray-200 dark:border-gray-700">
          <th className="w-[15%] px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
          <th className="w-[25%] px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
          <th className="w-[15%] px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
          <th className="w-[10%] px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
          <th className="w-[20%] px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Assign Device</th>
          <th className="w-[15%] px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
        </tr>
      </thead>

      <tbody>
        {operators.length > 0 ? (
          operators.map((o) => (
            <tr
              key={o.operator_id}
              className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="truncate px-3 py-2">{o.name}</td>
              <td className="truncate px-3 py-2">{o.email}</td>
              <td className="truncate px-3 py-2">{o.phone}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    o.status
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {o.status ? "Active" : "Inactive"}
                </span>
              </td>
     <td className="px-3 py-2">
  <div className="relative z-50"> {/* ensure positioned & high z-index */}
    <label htmlFor={`device-select-${o.operator_id}`} className="sr-only">
      Assign Device
    </label>

    <select
      id={`device-select-${o.operator_id}`}
      name="deviceSelect"
      defaultValue=""
      onChange={(e) => assignDevice(o.operator_id, e.target.value)}
      className="w-full border rounded-lg px-3 py-1.5 text-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      style={{ position: 'relative' }} // makes z-index apply on some browsers
    >
      <option value="" disabled className="text-gray-500">
        Select device
      </option>

      {devices.map((d) => (
        <option
          key={d.device_id}
          value={d.device_id}
          // inline style helps override some browser theme quirks
          style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
        >
          {d.device_name}
        </option>
      ))}
    </select>
  </div>
</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(o.operator_id)}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingOperator(o);
                      setShowForm(true);
                    }}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(o.operator_id)}
                    className={`text-xs px-3 py-1 rounded font-medium transition ${
                      o.status
                        ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                        : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                    }`}
                  >
                    {o.status ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
              No operators found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>



      </div>
      </div>
    </>
  );
}
