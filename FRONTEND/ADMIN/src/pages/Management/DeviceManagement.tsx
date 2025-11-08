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
 // ===========================
// VIEW DEVICE DETAILS (Enhanced)
// ===========================
const handleView = async (device_id: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/superadmin/devices/${device_id}/view`, {
      headers: authHeaders,
    });
    const data = await res.json();

    if (res.ok && data.data) {
      const device = data.data;
      Swal.fire({
        title: `<h3 class="text-lg font-semibold mb-2">Device: ${device.device_id}</h3>`,
        html: `
          <div style="text-align:left; line-height:1.6; font-size:14px;">
            <p><b>IMEI:</b> ${device.imei || "N/A"}</p>
            <p><b>Device Type:</b> ${device.device_type || "N/A"}</p>
            <p><b>SIM Number:</b> ${device.sim_number || "N/A"}</p>
            <p><b>Firmware Version:</b> ${device.firmware_version || "N/A"}</p>
            <p><b>Status:</b> ${
              device.status
                ? '<span style="color:green;font-weight:600;">Active</span>'
                : '<span style="color:red;font-weight:600;">Inactive</span>'
            }</p>
            <hr style="margin:8px 0;">
            <p><b>Assigned Operator ID:</b> ${device.assigned_operator_id || "N/A"}</p>
            <p><b>Assigned Vehicle ID:</b> ${device.assigned_vehicle_id || "N/A"}</p>
            <p><b>Assigned Date:</b> ${
              device.assigned_date
                ? new Date(device.assigned_date).toLocaleString()
                : "N/A"
            }</p>
            <hr style="margin:8px 0;">
            <p><b>Battery Level:</b> ${device.battery_level ?? "N/A"}%</p>
            <p><b>Created At:</b> ${
              device.createdAt ? new Date(device.createdAt).toLocaleString() : "N/A"
            }</p>
            <p><b>Updated At:</b> ${
              device.updatedAt ? new Date(device.updatedAt).toLocaleString() : "N/A"
            }</p>
          </div>
        `,
        width: 500,
        confirmButtonText: "Close",
      });
    } else {
      Swal.fire("Error", data.message || "Failed to fetch device details", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Unable to view device details.", "error");
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
