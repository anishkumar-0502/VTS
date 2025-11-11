import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

interface Device {
  _id: string;
  device_id: string;
  imei: string;
  device_type: string;
  sim_number: string;
  firmware_version: string;
  status: boolean;
  createdAt?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ManageDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    device_id: "",
    imei: "",
    device_type: "",
    sim_number: "",
    firmware_version: "",
  });

  // Fetch token from localStorage
  const token = localStorage.getItem("token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ===========================
  // FETCH ALL DEVICES
  // ===========================
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/superadmin/devices/list`, {
        headers: authHeaders,
      });
      const data = await res.json();

      if (res.ok) {
        setDevices(data.data || data.devices || []);
        setError("");
      } else {
        setError(data.message || "Failed to fetch devices");
        if (res.status === 401) {
          Swal.fire("Unauthorized", "Your session has expired. Please log in again.", "error");
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // ===========================
  // SAVE (CREATE / UPDATE)
  // ===========================
  const handleSave = async () => {
    if (!formData.device_id || !formData.imei || !formData.device_type) {
      Swal.fire("Validation Error", "Please fill all required fields.", "warning");
      return;
    }

    try {
      let res;
      if (editingDevice) {
        res = await fetch(
          `${API_BASE_URL}/superadmin/devices/${editingDevice.device_id}/update`,
          {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify(formData),
          }
        );
      } else {
        res = await fetch(`${API_BASE_URL}/superadmin/devices/create`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(formData),
        });
      }

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: editingDevice ? "Updated Successfully!" : "Device Created!",
          showConfirmButton: false,
          timer: 1500,
        });
        setShowForm(false);
        setEditingDevice(null);
        resetForm();
        fetchDevices();
      } else {
        Swal.fire("Error", data.message || "Failed to save device", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "An error occurred while saving device.", "error");
    }
  };

  // ===========================
  // VIEW DEVICE DETAILS
// ===========================
// VIEW DEVICE DETAILS
// ===========================
const handleView = async (device_id: string) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/superadmin/devices/${device_id}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const d = data.data;
    const darkMode = document.documentElement.classList.contains("dark");

    // Fetch assigned operator name
    let operatorName = "-";
    if (d.assigned_operator_id) {
      try {
        const operatorRes = await fetch(
          `${API_BASE_URL}/superadmin/operators/${d.assigned_operator_id}/view`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const operatorData = await operatorRes.json();
        if (operatorRes.ok && operatorData.data) {
          operatorName = operatorData.data.name || "-";
        }
      } catch {
        operatorName = "-";
      }
    }

    // Display SweetAlert
    Swal.fire({
      background: darkMode ? "#1f2937" : "#ffffff",
      color: darkMode ? "#e5e7eb" : "#111827",
      title: `<h3 style="font-size:16px; font-weight:600; margin-bottom:8px;">Device Details</h3>`,
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div><b>Device ID:</b> ${d.device_id}</div>
          <div><b>IMEI:</b> ${d.imei}</div>
          <div><b>Device Type:</b> ${d.device_type}</div>
          <div><b>SIM Number:</b> ${d.sim_number}</div>
          <div><b>Firmware:</b> ${d.firmware_version}</div>
         
          <div><b>Battery Level:</b> ${d.battery_level ?? "-"}%</div>
          <div><b>Last Signal:</b> ${d.last_signal ? new Date(d.last_signal).toLocaleString() : "-"}</div>
          <div><b>Last Location:</b> ${
            d.last_latitude && d.last_longitude
              ? `${d.last_latitude.toFixed(6)}, ${d.last_longitude.toFixed(6)}`
              : "-"
          }</div>
          <div><b>Assigned Operator:</b> ${operatorName}</div>
          <div><b>Assigned Date:</b> ${
            d.assigned_date ? new Date(d.assigned_date).toLocaleString() : "-"
          }</div>
           <div><b>Status:</b> ${
            d.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</div>
        </div>
      `,
      confirmButtonText: "Close",
      confirmButtonColor: darkMode ? "#6366f1" : "#4f46e5",
      width: 480,
      customClass: { popup: "rounded-xl shadow-lg" },
    });
  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: err.message,
      confirmButtonColor: "#ef4444",
    });
  }
};









  // ===========================
  // EDIT DEVICE
  // ===========================
  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      device_id: device.device_id,
      imei: device.imei,
      device_type: device.device_type,
      sim_number: device.sim_number,
      firmware_version: device.firmware_version,
    });
    setShowForm(true);
  };

  // ===========================
  // TOGGLE DEVICE STATUS
  // ===========================
  const handleToggleStatus = async (device: Device) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/superadmin/devices/${device.device_id}/deactivate`,
        {
          method: "PUT",
          headers: authHeaders,
        }
      );
      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: `Device ${device.status ? "Deactivated" : "Activated"}!`,
          showConfirmButton: false,
          timer: 1500,
        });
        fetchDevices();
      } else {
        Swal.fire("Error", data.message || "Failed to change status", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to toggle device status", "error");
    }
  };

  // ===========================
  // RESET FORM
  // ===========================
  const resetForm = () => {
    setFormData({
      device_id: "",
      imei: "",
      device_type: "",
      sim_number: "",
      firmware_version: "",
    });
  };

  // ===========================
  // LOADING STATE
  // ===========================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading devices...</p>
      </div>
    );
  }

  // ===========================
  // UI RENDER
  // ===========================
  return (
    <>
      <PageMeta title="Device Management | Admin" description="Manage GPS Devices" />
      <div>
        <PageBreadCrumb pageTitle="Device Management" />

<div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Devices
            </h2>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setEditingDevice(null);
                setShowForm(true);
              }}
            >
              Add Device
            </Button>
          </div>

          {/* ===================== FORM ===================== */}
          {showForm && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingDevice ? "Edit Device" : "Create Device"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["device_id", "imei", "device_type", "sim_number", "firmware_version"].map(
                  (field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {field.replace("_", " ")}
                      </label>
                      <input
                        type="text"
                        value={(formData as any)[field]}
                        onChange={(e) =>
                          setFormData({ ...formData, [field]: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDevice(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  {editingDevice ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}

          {/* ===================== TABLE ===================== */}
       <div className="w-full overflow-x-auto">
  <table className="min-w-full border-collapse">
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-700">
        {["Device ID", "IMEI", "SIM", "Status", "Actions"].map((h) => (
          <th
            key={h}
            className="px-2 py-1 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>

    <tbody>
      {devices.map((device) => (
        <tr
          key={device._id}
          className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-normal whitespace-nowrap"
        >
          <td className="px-2 py-1 font-normal">{device.device_id}</td>
          <td className="px-2 py-1 font-normal">{device.imei}</td>
          {/* <td className="px-2 py-1 font-normal">{device.device_type}</td> */}
          <td className="px-2 py-1 font-normal">{device.sim_number}</td>
          {/* <td className="px-2 py-1 font-normal">{device.firmware_version}</td> */}
          <td className="px-2 py-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                device.status
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {device.status ? "Active" : "Inactive"}
            </span>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <button
                onClick={() => handleView(device.device_id)}
                className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 font-normal"
              >
                View
              </button>
              <button
                onClick={() => handleEdit(device)}
                className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-normal"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleStatus(device)}
                className={`text-xs px-3 py-1 rounded font-normal ${
                  device.status
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                {device.status ? "Deactivate" : "Activate"}
              </button>
            </div>
          </td>
        </tr>
      ))}

      {devices.length === 0 && !error && (
        <tr>
          <td colSpan={7} className="text-center py-6 text-gray-500">
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
