import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import PageShimmer from "../../components/common/PageShimmer";

interface Device {
  _id: string;
  device_id: string;
  imei: string;
  device_type: string; 
  sim_number: string;
  firmware_version: string;
  status: boolean;
  createdAt?: string;
    assigned_vehicle_id?: string | null;
  vehicle_details?: {
    vehicle_number: string;
  } | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Toggle icons for activate/deactivate
const DeactivateIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="12" rx="6" fill="#ef4444" />
    <circle cx="18" cy="12" r="5" fill="#ffffff" />
  </svg>
);

const ActivateIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="12" rx="6" fill="#10b981" />
    <circle cx="6" cy="12" r="5" fill="#ffffff" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M2 12C4.5 7 8 5 12 5s7.5 2 10 7c-2.5 5-6 7-10 7s-7.5-2-10-7Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

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

  const [viewMode, setViewMode] = useState<"assigned" | "unassigned">("assigned");
const [assignedDevices, setAssignedDevices] = useState<Device[]>([]);
const [unassignedDevices, setUnassignedDevices] = useState<Device[]>([]);
// Pagination for lazy loading
const [devicePage, setDevicePage] = useState(1);
const [deviceTotalPages, setDeviceTotalPages] = useState(1);
const [loadingMoreDevices, setLoadingMoreDevices] = useState(false);
const pageSize = 10;

  // Fetch token from localStorage
  const token = localStorage.getItem("token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const showSuccess = (message: string) => {
  const dark = document.documentElement.classList.contains("dark");

  Swal.fire({
    icon: "success",
    title: message,
    background: dark ? "#1f2937" : "#ffffff",
    color: dark ? "#e5e7eb" : "#111827",
    confirmButtonColor: dark ? "#6366f1" : "#4f46e5",
    timer: 1600,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};


  // ===========================
  // FETCH ALL DEVICES
  // ===========================
const fetchDevices = async (page = 1) => {
  try {
    if (page === 1) setLoading(true);
    else setLoadingMoreDevices(true);

  const res = await fetch(
  `${API_BASE_URL}/superadmin/devices/list?page=${page}&limit=${pageSize}`,
  {
    headers: authHeaders,
  }
);
    const data = await res.json();

    if (res.ok) {
      const list = data.data || data.devices || [];
      
      // If page > 1, append, else replace
      setDevices((prev) => (page === 1 ? list : [...prev, ...list]));
      setAssignedDevices((prev) =>
        page === 1
          ? list.filter((d: any) => d.assigned_vehicle_id)
          : [...prev, ...list.filter((d: any) => d.assigned_vehicle_id)]
      );
      setUnassignedDevices((prev) =>
        page === 1
          ? list.filter((d: any) => !d.assigned_vehicle_id)
          : [...prev, ...list.filter((d: any) => !d.assigned_vehicle_id)]
      );

      // Update pagination info (assuming API returns totalPages)
      setDeviceTotalPages(data.totalPages || 1);
      setDevicePage(page);

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
    setLoadingMoreDevices(false);
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
      showSuccess(editingDevice ? "Device updated successfully!" : "Device created successfully!");

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


  // VIEW DEVICE DETAILS

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
      backdrop: false, 
  showCloseButton: true,
  showConfirmButton: false,
  width: 540,
  padding: "0",
  background: "transparent",
  html: `
  <!-- GRADIENT BORDER -->
  <div style="
    border-radius:26px;
    padding:2px;
    background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5);
    box-shadow:0 30px 80px rgba(0,0,0,.45);
  ">

    <!-- INNER CARD -->
    <div style="
      background:${darkMode ? "#020617" : "#ffffff"};
      border-radius:24px;
      overflow:hidden;
      font-family:Inter,system-ui,sans-serif;
      position:relative;
      text-align:left;
    ">

      <!-- SOFT GLOW -->
      <div style="
        position:absolute;
        inset:0;
        pointer-events:none;
        background:
          radial-gradient(600px at top left, rgba(99,102,241,.15), transparent 40%),
          radial-gradient(500px at bottom right, rgba(34,211,238,.12), transparent 45%);
      "></div>

      <!-- HEADER -->
      <div style="
        position:relative;
        padding:18px 22px;
        background:linear-gradient(135deg,#4f46e5,#6366f1);
        display:flex;
        align-items:center;
        gap:14px;
      ">
        <div style="
          width:54px;height:54px;border-radius:16px;
          background:rgba(255,255,255,.22);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:800;color:white;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
        ">
          ${d.device_id.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style="font-size:19px;font-weight:800;color:white">
            ${d.device_id}
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,.85)">
            Device Details
          </div>
        </div>
      </div>

      <!-- CONTENT (UNCHANGED DATA) -->
      <div style="position:relative; padding:22px; font-size:14px; color:${darkMode ? "#e5e7eb" : "#111827"};">

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          line-height:1.6;
        ">
          <div><b>IMEI:</b> ${d.imei}</div>
          <div><b>Device Type:</b> ${d.device_type}</div>
          <div><b>SIM Number:</b> ${d.sim_number}</div>
          <div><b>Firmware:</b> ${d.firmware_version}</div>
          <div><b>Battery Level:</b> ${d.battery_level ?? "-"}%</div>
          <div><b>Last Signal:</b> ${d.last_signal ? new Date(d.last_signal).toLocaleString() : "-"}</div>
          <div><b>Assigned Operator:</b> ${operatorName}</div>
          <div><b>Assigned Date:</b> ${
            d.assigned_date ? new Date(d.assigned_date).toLocaleString() : "-"
          }</div>
          <div>
            <b>Status:</b>
            ${
              d.status
                ? `<span style="margin-left:6px;color:#10b981;font-weight:600;">Active</span>`
                : `<span style="margin-left:6px;color:#ef4444;font-weight:600;">Inactive</span>`
            }
          </div>
        </div>

      </div>
    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" }
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
       showSuccess(device.status ? "Device deactivated successfully!" : "Device activated successfully!");

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
if (loading)
  return (
    <PageShimmer />
  );

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

  {!showForm && (
 <div className="flex items-center gap-3">
  {/* View Mode Select */}
  <div className="relative">
    <select
      value={viewMode}
      onChange={(e) =>
        setViewMode(e.target.value as "assigned" | "unassigned")
      }
      className="
        appearance-none rounded-full px-4 py-2 pr-9
        text-sm font-medium
        bg-indigo-50 dark:bg-gray-800
        text-indigo-700 dark:text-indigo-300
        border border-indigo-200 dark:border-gray-700
        shadow-sm
        hover:bg-indigo-100 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-indigo-400
      "
    >
      <option value="assigned">Assigned Devices</option>
      <option value="unassigned">Unassigned Devices</option>
    </select>

    {/* Dropdown Icon */}
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </div>

  {/* Add Device Button */}
  <Button
    size="sm"
    className="
      rounded-full px-5 py-2
      bg-indigo-600 hover:bg-indigo-700
      text-white font-medium
      shadow-md hover:shadow-lg
      transition-all
    "
    onClick={() => {
      resetForm();
      setEditingDevice(null);
      setShowForm(true);
    }}
  >
    + Add Device
  </Button>
</div>

  )}
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
{!showForm && (
<div
  className="relative max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700"
  onScroll={(e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollTop + clientHeight >= scrollHeight - 20 &&
      devicePage < deviceTotalPages &&
      !loadingMoreDevices
    ) {
      fetchDevices(devicePage + 1);
    }
  }}
>
  <table className="min-w-full text-sm ">
    <thead className="sticky top-0 z-10 backdrop-blur bg-gray-50/90 dark:bg-gray-800/90">
      <tr className="border-b border-gray-200 dark:border-gray-700">
        {[
          "Device ID",
          "IMEI",
          "SIM",
          ...(viewMode === "assigned" ? ["Assigned Vehicle"] : []),
          "Status",
          "Actions",
        ].map((h) => (
          <th
            key={h}
            className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wide"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {(viewMode === "assigned" ? assignedDevices : unassignedDevices).map(
        (device: Device) => (
          <tr
            key={device._id}
            className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
          >
            <td className="px-3 py-2 font-medium  text-gray-600 dark:text-gray-400">
              {device.device_id}
            </td>

            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
              {device.imei}
            </td>

            <td className="px-3 py-2  text-gray-600 dark:text-gray-400">
              {device.sim_number}
            </td>

            {viewMode === "assigned" && (
              <td className="px-3 py-2  text-gray-600 dark:text-gray-400">
                {device.vehicle_details?.vehicle_number || "—"}
              </td>
            )}

            <td className="px-3 py-2  text-gray-600 dark:text-gray-400">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  device.status
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {device.status ? "Active" : "Inactive"}
              </span>
            </td>

            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(device)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  title={device.status ? "Deactivate Device" : "Activate Device"}
                >
                  {device.status ? <DeactivateIcon /> : <ActivateIcon />}
                </button>

                <button
                  onClick={() => handleView(device.device_id)}
                  className="p-1.5 rounded-md text-gray-600 dark:text-gray-300
                  hover:bg-blue-50 hover:text-blue-600
                  dark:hover:bg-blue-900/40 transition"
                >
                  <EyeIcon />
                </button>

                <button
                  onClick={() => handleEdit(device)}
                  className="p-1.5 rounded-md text-gray-600 dark:text-gray-300
                  hover:bg-indigo-50 hover:text-indigo-600
                  dark:hover:bg-indigo-900/40 transition"
                >
                  <EditIcon />
                </button>
              </div>
            </td>
          </tr>
        )
      )}

      {(viewMode === "assigned"
        ? assignedDevices
        : unassignedDevices
      ).length === 0 && !error && (
        <tr>
          <td
            colSpan={viewMode === "assigned" ? 6 : 5}
            className="py-10 text-center text-gray-500 dark:text-gray-400 italic"
          >
            No devices found
          </td>
        </tr>
      )}
    </tbody>
  </table>

  {loadingMoreDevices && (
    <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">
      Loading more devices…
    </div>
  )}
</div>
)}




        </div>
      </div>
    </>
  );
}
