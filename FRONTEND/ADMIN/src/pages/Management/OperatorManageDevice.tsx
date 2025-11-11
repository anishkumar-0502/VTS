import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface GPSDevice {
  _id: string;
  device_id: string;
  imei: string;
  sim_number: string;
  status: boolean;
  device_type?: string;
  assigned_operator_id?: string;
  assigned_vehicle_id?: string | null;
  assigned_date?: string;
  battery_level?: number;
  firmware_version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function GPSDevices() {
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingDevice, setEditingDevice] = useState<GPSDevice | null>(null);
  const [refreshTable, setRefreshTable] = useState(false);
  const [editFields, setEditFields] = useState({
    device_id: "",
    sim_number: "",
  });

  // 🔹 Fetch all devices
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/operator/devices/list`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (!res.ok || result.error)
        throw new Error(result.message || "Failed to fetch devices");
      setDevices(result.data || []);
    } catch (err: any) {
      setError(err.message);
      Swal.fire("Error", err.message || "Failed to load devices", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 View Device Details (SweetAlert Popup)
 const handleView = async (device_id: string) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/operator/devices/${device_id}/view`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await res.json();
    if (!res.ok || result.error)
      throw new Error(result.message || "Failed to view device");

    const d = result.data;
    const formatDate = (dateStr: string) =>
      dateStr ? new Date(dateStr).toLocaleString() : "-";

    const darkMode = document.documentElement.classList.contains("dark");

    Swal.fire({
      background: darkMode ? "#1f2937" : "#ffffff",
      color: darkMode ? "#e5e7eb" : "#111827",
      title: `<h3 style="font-size:16px; font-weight:600; margin-bottom:8px;">Device Details</h3>`,
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6;">
          <p><b>Device ID:</b> ${d.device_id}</p>
          <p><b>IMEI:</b> ${d.imei}</p>
          <p><b>Device Type:</b> ${d.device_type || "-"}</p>
        
          <hr style="margin:10px 0;border:none;border-top:1px solid ${
            darkMode ? "#374151" : "#e5e7eb"
          };"/>

          <p><b>SIM Number:</b> ${d.sim_number || "-"}</p>
          <p><b>Battery Level:</b> ${d.battery_level ?? "--"}%</p>
          <p><b>Firmware Version:</b> ${d.firmware_version || "-"}</p>

          <hr style="margin:10px 0;border:none;border-top:1px solid ${
            darkMode ? "#374151" : "#e5e7eb"
          };"/>
          <p><b>Assigned Vehicle Number:</b> ${
            d.assigned_vehicle?.vehicle_number || "-"
          }</p>
          <p><b>Assigned Date:</b> ${formatDate(d.assigned_date)}</p>
           <p><b>Status:</b> ${
            d.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</p>

        </div>
      `,
      confirmButtonText: "Close",
      confirmButtonColor: darkMode ? "#6366f1" : "#4f46e5",
      width: 420,
      customClass: {
        popup: "rounded-xl shadow-lg",
      },
    });
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: err.message || "Failed to view device",
      confirmButtonColor: "#ef4444",
    });
  }
};


  // 🔹 Edit Device
// 🔹 Edit Device (SweetAlert popup form)
const handleEdit = async (device: GPSDevice) => {
  const { value: formValues } = await Swal.fire({
    title: "Edit Device",
    html: `
      <div style="text-align:left">
        <label style="font-size:14px; font-weight:500;">Device ID</label>
        <input 
          id="swal-device_id" 
          class="swal2-input" 
          placeholder="Device ID" 
          value="${device.device_id}" 
          readonly
          style="background-color:#f3f4f6; cursor:not-allowed;"
        >
        <label style="font-size:14px; font-weight:500;">SIM Number</label>
        <input 
          id="swal-sim_number" 
          class="swal2-input" 
          placeholder="SIM Number" 
          value="${device.sim_number}"
        >
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Save",
    confirmButtonColor: "#2563eb",
    preConfirm: () => {
      const sim_number = (document.getElementById("swal-sim_number") as HTMLInputElement).value;
      if (!sim_number) {
        Swal.showValidationMessage("Please fill out all fields");
        return;
      }
      return { sim_number };
    },
  });

  if (formValues) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/operator/devices/${device.device_id}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formValues),
        }
      );

      const result = await res.json();
      if (!res.ok || result.error)
        throw new Error(result.message || "Failed to update device");

      Swal.fire("Updated!", "Device updated successfully.", "success");
      setRefreshTable(!refreshTable);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Update failed", "error");
    }
  }
};



  // 🔹 Toggle Activate/Deactivate Device
  const handleToggleStatus = async (device_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/operator/devices/${device_id}/deactivate`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await res.json();
      if (!res.ok || result.error)
        throw new Error(result.message || "Failed to toggle device status");

      Swal.fire("Success", result.message || "Status updated successfully", "success");
      setRefreshTable(!refreshTable);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Toggle failed", "error");
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [refreshTable]);

  if (loading) return <p className="text-center py-6">Loading devices...</p>;
  if (error)
    return <p className="text-center py-6 text-red-500">Error: {error}</p>;

  return (
    <>
      <PageMeta title="Device Management | VTS Admin" description="Manage devices" />
      <div>
        <PageBreadCrumb pageTitle="Device Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Devices
            </h2>
          </div>

          {/* ===================== TABLE ===================== */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {["#", "Device ID", "IMEI", "SIM", "Status", "Actions"].map((h) => (
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
                {devices.map((d, i) => (
                  <tr
                    key={d._id}
                    className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                      {d.device_id}
                    </td>
                    <td className="px-3 py-2">{d.imei}</td>
                    <td className="px-3 py-2">{d.sim_number}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          d.status
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(d.device_id)}
                          className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                        >
                          View
                        </button>
                       <button
  onClick={() => handleEdit(d)}
  className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
>
  Edit
</button>

                        <button
                          onClick={() => handleToggleStatus(d.device_id)}
                          className={`text-xs px-3 py-1 rounded ${
                            d.status
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {d.status ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {devices.length === 0 && !error && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No devices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
