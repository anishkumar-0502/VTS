import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import PageShimmer from "../../components/common/PageShimmer";


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
    assigned_vehicle?: { vehicle_number: string };
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

  const [filterType, setFilterType] = useState<"assigned" | "unassigned">("assigned");
  const [assignedDevices, setAssignedDevices] = useState<GPSDevice[]>([]);
const [unassignedDevices, setUnassignedDevices] = useState<GPSDevice[]>([]);
const list = filterType === "assigned" ? assignedDevices : unassignedDevices;

// Pagination
const [page, setPage] = useState(1);
const [limit] = useState(10);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);


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


  // 🔹 Fetch all devices
const fetchDevices = async (pageNum = 1) => {
  try {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    const token = localStorage.getItem("token");
    const res = await fetch(
      `${API_BASE_URL}/operator/devices/list?page=${pageNum}&limit=${limit}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await res.json();

    if (!res.ok || result.error)
      throw new Error(result.message || "Failed to fetch devices");

    const newData = result.data || [];

    if (pageNum === 1) {
      setDevices(newData);
    } else {
      setDevices((prev) => [...prev, ...newData]);
    }

    // Classify again after update
    const assigned = newData.filter((d: any) => d.assigned_vehicle_id);
    const unassigned = newData.filter((d: any) => !d.assigned_vehicle_id);

    if (pageNum === 1) {
      setAssignedDevices(assigned);
      setUnassignedDevices(unassigned);
    } else {
      setAssignedDevices((prev) => [...prev, ...assigned]);
      setUnassignedDevices((prev) => [...prev, ...unassigned]);
    }

    // Check if more data exists
    setHasMore(newData.length === limit);

    setPage(pageNum);
  } catch (err: any) {
    setError(err.message);
    Swal.fire("Error", err.message || "Failed to load devices", "error");
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
};


  // 🔹 View Device Details (SweetAlert Popup)
const handleView = async (device_id: string) => {
  try {
    console.log("Viewing Device ID:", device_id);
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
    const formatDate = (dateStr: string) => (dateStr ? new Date(dateStr).toLocaleString() : "-");
    const darkMode = document.documentElement.classList.contains("dark");

    // Helper for displaying label + value rows
    const infoRow = (label: string, value: string | number | null | undefined): string => {
      return `
        <div style="
          font-size:14px;
          font-weight:500;
          padding:4px 0;
          color:${darkMode ? "#e5e7eb" : "#111827"};
        ">
          <b>${label} :</b> ${value ?? "N/A"}
        </div>
      `;
    };

    Swal.fire({
      showCloseButton: true,
      showConfirmButton: false,
      width: 520,
      padding: "20px",
      html: `
        <div style="text-align:left;">

          <!-- Header -->
          <div style="display:flex; align-items:center; gap:15px; padding-bottom:15px;">
            <div style="
              width:55px; height:55px; border-radius:50%;
              background:#4f46e533; display:flex;
              align-items:center; justify-content:center;
              font-size:22px; font-weight:700; color:#4f46e5;">
              ${d.device_id.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:20px; font-weight:700; color:${darkMode ? "#e5e7eb" : "#111827"};">
                ${d.device_id}
              </div>
              <div style="font-size:13px; color:${darkMode ? "#9ca3af" : "#6b7280"};">
                Device Details
              </div>
            </div>
          </div>

          <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:12px 0;" />

          <!-- Device Info -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${infoRow("IMEI", d.imei)}
            ${infoRow("Device Type", d.device_type)}
            ${infoRow("SIM Number", d.sim_number)}
            ${infoRow("Battery Level", d.battery_level ? `${d.battery_level}%` : "-")}
            ${infoRow("Firmware Version", d.firmware_version)}
            ${infoRow("Assigned Vehicle", d.assigned_vehicle?.vehicle_number)}
            ${infoRow("Assigned Date", formatDate(d.assigned_date))}
            <div style="
              font-size:14px;
              font-weight:500;
              padding:4px 0;
              color:${darkMode ? "#e5e7eb" : "#111827"};">
              <b>Status :</b> ${
                d.status
                  ? `<span style="background:#10b98122; color:#10b981; padding:3px 8px; border-radius:6px; font-size:12px;">Active</span>`
                  : `<span style="background:#ef444422; color:#ef4444; padding:3px 8px; border-radius:6px; font-size:12px;">Inactive</span>`
              }
            </div>
          </div>

        </div>
      `,
      customClass: { popup: "card-popup" },
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
const handleEdit = async (device: GPSDevice) => {
  const darkMode = document.documentElement.classList.contains("dark");

  const { value: formValues } = await Swal.fire({
    title: "Edit Device",
    html: `
      <div style="text-align:left; display:flex; flex-direction:column; gap:12px;">
        <label style="font-size:14px; font-weight:500; color:${darkMode ? '#e5e7eb' : '#111827'};">Device ID</label>
        <input 
          id="swal-device_id" 
          class="swal2-input" 
          placeholder="Device ID" 
          value="${device.device_id}" 
          readonly
          style="
            background-color:${darkMode ? '#1f2937' : '#f3f4f6'};
            color:${darkMode ? '#e5e7eb' : '#111827'};
            cursor:not-allowed;
          "
        >
        <label style="font-size:14px; font-weight:500; color:${darkMode ? '#e5e7eb' : '#111827'};">SIM Number</label>
        <input 
          id="swal-sim_number" 
          class="swal2-input" 
          placeholder="SIM Number" 
          value="${device.sim_number}"
          style="
            background-color:${darkMode ? '#1f2937' : '#fff'};
            color:${darkMode ? '#e5e7eb' : '#111827'};
          "
        >
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Save",
    confirmButtonColor: "#2563eb",
    cancelButtonColor: darkMode ? "#374151" : "#d1d5db",
    preConfirm: () => {
      const sim_number = (document.getElementById("swal-sim_number") as HTMLInputElement).value;
      if (!sim_number) {
        Swal.showValidationMessage("Please fill out all fields");
        return;
      }
      return { sim_number };
    },
    background: darkMode ? "#111827" : "#ffffff", // popup background
    color: darkMode ? "#e5e7eb" : "#111827",      // default text color
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

showSuccess("Device updated successfully!"); 
      setRefreshTable(!refreshTable);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Update failed", "error");
    }
  }
};




  // 🔹 Toggle Activate/Deactivate Device
  const handleToggleStatus = async (device_id: string) => {
    try {
      console.log("Toggling Status for Device ID:", device_id);
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

    showSuccess(result.message || "Status updated successfully!"); 
      setRefreshTable(!refreshTable);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Toggle failed", "error");
    }
  };

  useEffect(() => {
    fetchDevices(1);
  }, [refreshTable]);

  useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 50 >=
      document.documentElement.scrollHeight &&
      hasMore &&
      !loadingMore
    ) {
      fetchDevices(page + 1);
    }
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, [page, hasMore, loadingMore]);


  if (loading)
  return (
    <PageShimmer />
  );

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
             <div className="mb-4">
  <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value as any)}
    className="px-3 py-2 border rounded dark:bg-gray-800 dark:text-gray-200"
  >
    <option value="assigned">Assigned Devices</option>
    <option value="unassigned">Unassigned Devices</option>
  </select>
</div>
          </div>
         


          {/* ===================== TABLE ===================== */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
               <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Device ID</th>
                  <th className="px-3 py-2">IMEI</th>
                  <th className="px-3 py-2">SIM</th>
                  {filterType === "assigned" && (
                    <th className="px-3 py-2">Assigned Vehicle</th>
                    )}
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                    </tr>
                    </thead>


              <tbody>
                {list.map((d, i) => (
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

    {/* Assigned Vehicle Column ONLY for assigned devices */}
    {filterType === "assigned" && (
      <td className="px-3 py-2 font-medium">
        {d.assigned_vehicle?.vehicle_number || "-"} 
      </td>
    )}

    <td className="px-3 py-2">
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          d.status
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        }`}
      >
        {d.status ? "Active" : "Inactive"}
      </span>
    </td>

    <td className="px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleToggleStatus(d.device_id)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
        >
          {d.status ? <DeactivateIcon /> : <ActivateIcon />}
        </button>

        <button
          onClick={() => handleView(d.device_id)}
          className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          View
        </button>

        <button
          onClick={() => handleEdit(d)}
          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
        >
          Edit
        </button>
      </div>
    </td>
  </tr>
))}


                {/* {devices.length === 0 && !error && ( */}
                {list.length === 0 && !error && (

                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No devices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {hasMore && (
  <div className="flex justify-center py-4">
    <button
      onClick={() => fetchDevices(page + 1)}
      disabled={loadingMore}
      className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
    >
      {loadingMore ? "Loading..." : "Load More"}
    </button>
  </div>
)}

          </div>
        </div>
      </div>
    </>
  );
}
