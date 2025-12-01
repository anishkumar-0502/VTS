import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import PageShimmer from "../../components/common/PageShimmer";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface Operator {
  operator_id: string;
  name: string;
  email: string;phone?: string;
phone_number?: string;
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
  assigned_vehicle_id?: string;
}

interface Driver {
  name: string;
  user_id: string;
  assigned_vehicle_id?: string;
}

interface Device {
  device_id: string;
  assigned_vehicle_id?: string;
}

interface Vehicle {
  vehicle_number: string;
  vehicle_id: string;
  assigned_driver_id?: string;
  assigned_device_id?: string;
}


export default function ManageOperators() {
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);           // Current page
const [pageSize] = useState(10);               // Number of operators per page
const [totalPages, setTotalPages] = useState(1); // Total pages from API
const [loadingMore, setLoadingMore] = useState(false); // Lazy load spinner
const [devicePage, setDevicePage] = useState(1);
const [devicePageSize] = useState(10);
const [deviceTotalPages, setDeviceTotalPages] = useState(1);
const [loadingDevices, setLoadingDevices] = useState(false);
const [loadingMoreDevices, setLoadingMoreDevices] = useState(false);


  const isDark = document.documentElement.classList.contains("dark");

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


  const swalBaseConfig = {
    background: isDark ? "#1f2937" : "#ffffff",
    color: isDark ? "#e5e7eb" : "#111827",
    confirmButtonColor: isDark ? "#6366f1" : "#4f46e5",
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

  // Fetch operators
const fetchOperators = async (pageNum = 1) => {
  try {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/operators/list?page=${pageNum}&limit=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.ok && data.data) {
      if (pageNum === 1) setOperators(data.data);
      else setOperators((prev) => [...prev, ...data.data]);

      setTotalPages(data.pagination?.totalPages || 1); // if API returns total pages
      setPage(pageNum);
    } else throw new Error(data.message || "Failed to fetch operators");
  } catch (err: any) {
    Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
};


  // Fetch devices
const fetchDevices = async (pageNum = 1) => {
  try {
    if (pageNum === 1) setLoadingDevices(true);
    else setLoadingMoreDevices(true);

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/devices/list?page=${pageNum}&limit=${devicePageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.ok && data.data) {
      if (pageNum === 1) setDevices(data.data);
      else setDevices((prev) => [...prev, ...data.data]);

      setDeviceTotalPages(data.pagination?.totalPages || 1);
      setDevicePage(pageNum);
    } else {
      throw new Error(data.message || "Failed to fetch devices");
    }
  } catch (err: any) {
    Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
  } finally {
    setLoadingDevices(false);
    setLoadingMoreDevices(false);
  }
};


  useEffect(() => {
    fetchOperators(1);
    fetchDevices(1);
  }, []);

  // Create / Update
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    let body = Object.fromEntries(formData.entries());

body = {
  name: body.name,
  email: body.email,
  phone_number: body.phone || body.phone_number,
  registration_number: body.registration_number,
  company_name: body.company_name,
  address: body.address,
  city: body.city,
  state: body.state,
  postal_code: body.postal_code,
  country: body.country,
};
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

     showSuccess(editingOperator ? "Operator updated successfully!" : "Operator created successfully!");

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

      showSuccess("Operator status updated successfully!");
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

    showSuccess("Device assigned successfully!");

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

   showSuccess("Device unassigned successfully!");

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
     const darkMode = document.documentElement.classList.contains("dark");

    // Helper for uniform label/value display
    const infoRow = (
      label: string,
      value: string | number | null | undefined
    ): string => {
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
    

    // Build HTML for all assigned drivers
   const assignedDriversHTML = o.drivers.length > 0
  ? o.drivers.map((d: Driver) => `<div>${d.name}</div>`).join("")
  : "<div>N/A</div>";

const assignedDevicesHTML = o.devices.length > 0
  ? o.devices.map((d: Device) => `<div>${d.device_id}</div>`).join("")
  : "<div>N/A</div>";

const assignedVehiclesHTML = o.vehicles.length > 0
  ? o.vehicles.map((v: Vehicle) => `<div>${v.vehicle_number}</div>`).join("")
  : "<div>N/A</div>";

Swal.fire({
  showCloseButton: true,
  showConfirmButton: false,
  width: 700,
  padding: "20px",
  html: `
   <div style="text-align:left; font-family:Arial, sans-serif; color:${darkMode ? "#e5e7eb" : "#111827"};">

  <!-- Header -->
  <div style="display:flex; align-items:center; gap:15px; padding-bottom:18px;">
    <div style="
      width:60px; height:60px; border-radius:50%;
      background:#4f46e533; display:flex;
      align-items:center; justify-content:center;
      font-size:24px; font-weight:700; color:#4f46e5;
    ">
      ${o.name.charAt(0).toUpperCase()}
    </div>

    <div>
      <div style="font-size:20px; font-weight:700; color:${darkMode ? "#e5e7eb" : "#111827"};">
        ${o.name}
      </div>

      <div style="font-size:14px; color:${darkMode ? "#e5e7eb" : "#6b7280"};">
        Operator
      </div>
    </div>
  </div>

  <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:14px 0;" />

  <!-- Basic Info -->
<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:14px;">

  <div style="display:flex; gap:6px; align-items:center;">
    <b style="color:${darkMode ? "#e5e7eb" : "#111827"};">Email:</b>
    <span style="color:${darkMode ? "#e5e7eb" : "#111827"};">${o.email}</span>
  </div>

  <div style="display:flex; gap:6px; align-items:center;">
    <b style="color:${darkMode ? "#e5e7eb" : "#111827"};">Phone:</b>
    <span style="color:${darkMode ? "#e5e7eb" : "#111827"};">${o.phone || "N/A"}</span>
  </div>

  <div style="display:flex; gap:6px; align-items:center;">
    <b style="color:${darkMode ? "#e5e7eb" : "#111827"};">Registration #:</b>
    <span style="color:${darkMode ? "#e5e7eb" : "#111827"};">${o.registration_number || "N/A"}</span>
  </div>

  <div style="display:flex; gap:6px; align-items:center;">
    <b style="color:${darkMode ? "#e5e7eb" : "#111827"};">Company:</b>
    <span style="color:${darkMode ? "#e5e7eb" : "#111827"};">${o.company_name || "N/A"}</span>
  </div>

  <div style="display:flex; gap:6px; align-items:center;">
    <b style="color:${darkMode ? "#e5e7eb" : "#111827"};">Country:</b>
    <span style="color:${darkMode ? "#e5e7eb" : "#111827"};">${o.country || "N/A"}</span>
  </div>

  <div style="display:flex; gap:6px; align-items:center;">
    <b style="color:${darkMode ? "#e5e7eb" : "#111827"};">Status:</b>
    <span>
      ${
        o.status
          ? `<span style="background:#10b98122; color:#10b981; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600;">Active</span>`
          : `<span style="background:#ef444422; color:#ef4444; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600;">Inactive</span>`
      }
    </span>
  </div>

</div>


  <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:18px 0;" />

  <!-- Assigned Details -->
  <div>
    <b style="font-size:15px; color:${darkMode ? "#e5e7eb" : "#111827"};">Assigned Details</b>

    <table style="
      width:100%;
      border-collapse: collapse;
      margin-top:12px;
      font-size:14px;
      border:1px solid ${darkMode ? "#4b5563" : "#ddd"};
      color:${darkMode ? "#e5e7eb" : "#111827"};
    ">
      <thead>
        <tr style="background:${darkMode ? "#1f2937" : "#f3f4f6"};">
          <th style="padding:10px; border-bottom:1px solid ${darkMode ? "#374151" : "#ddd"}; text-align:left; color:${darkMode ? "#e5e7eb" : "#111827"};">Drivers</th>
          <th style="padding:10px; border-bottom:1px solid ${darkMode ? "#374151" : "#ddd"}; text-align:left; color:${darkMode ? "#e5e7eb" : "#111827"};">Devices</th>
          <th style="padding:10px; border-bottom:1px solid ${darkMode ? "#374151" : "#ddd"}; text-align:left; color:${darkMode ? "#e5e7eb" : "#111827"};">Vehicles</th>
        </tr>
      </thead>

      <tbody>
        ${(() => {
          const maxRows = Math.max(o.drivers.length, o.devices.length, o.vehicles.length);
          let rows = "";

          for (let i = 0; i < maxRows; i++) {
            rows += `
              <tr style="color:${darkMode ? "#e5e7eb" : "#111827"};">
                <td style="padding:8px 10px; border-bottom:1px solid ${darkMode ? "#374151" : "#eee"};">
                  ${o.drivers[i] ? o.drivers[i].name : "—"}
                </td>

                <td style="padding:8px 10px; border-bottom:1px solid ${darkMode ? "#374151" : "#eee"};">
                  ${o.devices[i] ? o.devices[i].device_id : "—"}
                </td>

                <td style="padding:8px 10px; border-bottom:1px solid ${darkMode ? "#374151" : "#eee"};">
                  ${o.vehicles[i] ? o.vehicles[i].vehicle_number : "—"}
                </td>
              </tr>
            `;
          }
          return rows;
        })()}
      </tbody>
    </table>
  </div>

</div>

  `,
  customClass: { popup: "card-popup" }
});


  } catch (err: any) {
    Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
  }
};

const handleViewDevices = async (operator_id: string) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/operators/${operator_id}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const o = data.data;
    const darkMode = document.documentElement.classList.contains("dark");
    const textColor = darkMode ? "#e5e7eb" : "#111827";
    const mutedColor = darkMode ? "#9ca3af" : "#6b7280";
    const borderColor = darkMode ? "#374151" : "#e5e7eb";
    const headerBg = darkMode ? "#1f2937" : "#f3f4f6";
    const tableBorder = darkMode ? "#374151" : "#d1d5db";
    const rowBg = darkMode ? "#111827" : "#ffffff";

    // Devices table HTML with forced inline colors for every cell
    const devicesHTML =
      o.devices && o.devices.length > 0
        ? `
      <table style="width:100%; border-collapse:collapse; font-size:12px; color:${textColor} !important;">
        <thead>
          <tr style="background:${headerBg}; color:${textColor} !important; text-align:left;">
            <th style="padding:6px 8px; border:1px solid ${tableBorder}; color:${textColor} !important;">Device ID</th>
            <th style="padding:6px 8px; border:1px solid ${tableBorder}; color:${textColor} !important;">IMEI</th>
            <th style="padding:6px 8px; border:1px solid ${tableBorder}; color:${textColor} !important;">Type</th>
            <th style="padding:6px 8px; border:1px solid ${tableBorder}; color:${textColor} !important;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${o.devices
            .map(
              (d: any) => `
            <tr style="border-bottom:1px solid ${tableBorder}; background:${rowBg}; color:${textColor} !important;">
              <td style="padding:4px 8px; color:${textColor} !important;">${d.device_id}</td>
              <td style="padding:4px 8px; color:${textColor} !important;">${d.imei || "N/A"}</td>
              <td style="padding:4px 8px; color:${textColor} !important;">${d.device_type || "N/A"}</td>
              <td style="padding:4px 8px; font-weight:600; color:${d.status ? "#10b981" : "#ef4444"} !important;">
                ${d.status ? "Active" : "Inactive"}
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      `
        : `<div style="font-size:12px; color:${mutedColor} !important; text-align:center;">No devices assigned.</div>`;

    Swal.fire({
      showCloseButton: true,
      showConfirmButton: false,
      width: 520,
      padding: "20px",
      html: `
      <div style="text-align:left; font-family:Arial, sans-serif; color:${textColor} !important;">

        <!-- Header -->
        <div style="display:flex; align-items:center; gap:15px; padding-bottom:15px;">
          <div style="
            width:55px; height:55px; border-radius:50%;
            background:#4f46e533; display:flex;
            align-items:center; justify-content:center;
            font-size:22px; font-weight:700; color:#4f46e5;
          ">
            ${o.name ? o.name.charAt(0).toUpperCase() : "O"}
          </div>
          <div>
            <div style="font-size:20px; font-weight:700; color:${textColor} !important;">${o.name}</div>
            <div style="font-size:13px; color:${mutedColor} !important;">Operator</div>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid ${borderColor}; margin:12px 0;" />

        <!-- Basic Info (Single Line) -->
        <div style="display:flex; flex-direction:column; gap:8px; font-size:14px;">

          <div style="display:flex; gap:6px; color:${textColor} !important;">
            <b style="min-width:70px; color:${textColor} !important;">Email :</b>
            <span style="color:${textColor} !important;">${o.email || "N/A"}</span>
          </div>

          <div style="display:flex; gap:6px; color:${textColor} !important;">
            <b style="min-width:70px; color:${textColor} !important;">Phone :</b>
            <span style="color:${textColor} !important;">${o.phone || "N/A"}</span>
          </div>

          <div style="display:flex; gap:6px; align-items:center; color:${textColor} !important;">
            <b style="min-width:70px; color:${textColor} !important;">Status :</b>
            ${
              o.status
                ? `<span style="background:#10b98122; color:#10b981; padding:3px 8px; border-radius:6px; font-size:12px;">Active</span>`
                : `<span style="background:#ef444422; color:#ef4444; padding:3px 8px; border-radius:6px; font-size:12px;">Inactive</span>`
            }
          </div>

        </div>

        <hr style="border:none; border-top:1px solid ${borderColor}; margin:14px 0;" />

        <!-- Devices Section -->
        <div style="font-size:15px; font-weight:600; margin-bottom:10px; color:${textColor} !important;">Assigned Devices</div>

        <div style="max-height:300px; overflow:auto; border-radius:6px; color:${textColor} !important;">
          ${devicesHTML}
        </div>

      </div>
      `,
      customClass: { popup: "card-popup" }
    });
  } catch (err: any) {
    Swal.fire({ icon: "error", title: "Error", text: err.message });
  }
};




if (loading)
  return (
    <PageShimmer />
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
                  "phone_number",
                  "registration_number",
                  "company_name", 
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


<div className="relative w-full overflow-hidden">
  <div
    className="max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg"
    onScroll={(e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 50 && page < totalPages && !loadingMore) {
        fetchOperators(page + 1);
      }
    }}
  >
    <table className="min-w-full border-collapse table-fixed">
      <thead>
        <tr className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
          {["Name", "Email", "Phone", "Assign Device", "Status", "Actions"].map((h) => (
            <th
              key={h}
              className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {operators.length > 0 ? (
          operators.map((o) => (
            <tr
              key={o.operator_id}
              className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-3 py-2 whitespace-nowrap">{o.name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{o.email}</td>
              <td className="px-3 py-2 whitespace-nowrap">{o.phone || o.phone_number}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ minWidth: "150px" }}>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => handleViewDevices(o.operator_id)}
                    className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    View
                  </button>
                  <select
                    id={`device-select-${o.operator_id}`}
                    defaultValue=""
                    onChange={(e) => assignDevice(o.operator_id, e.target.value)}
                    disabled={devices.filter((d) => !(d as any).assigned_operator_id).length === 0}
                    className="w-full rounded-md border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    {devices.filter((d) => !(d as any).assigned_operator_id).length > 0 ? (
                      <>
                        <option value="" disabled>
                          Select
                        </option>
                        {devices
                          .filter((d) => !(d as any).assigned_operator_id)
                          .map((d) => (
                            <option key={d.device_id} value={d.device_id}>
                              {d.device_id}
                            </option>
                          ))}
                      </>
                    ) : (
                      <option value="" disabled>
                        None
                      </option>
                    )}
                  </select>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
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
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatus(o.operator_id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors dark:hover:bg-gray-700"
                    title={o.status ? "Deactivate Operator" : "Activate Operator"}
                  >
                    {o.status ? <DeactivateIcon /> : <ActivateIcon />}
                  </button>
                  <button
                    onClick={() => handleView(o.operator_id)}
                    className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingOperator(o);
                      setShowForm(true);
                    }}
                    className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    Edit
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

    {loadingMore && (
      <div className="text-center py-2 text-gray-500 dark:text-gray-400">
        Loading more operators...
      </div>
    )}
  </div>
</div>


  </div>
</div>



      </div>
      </div>
    </>
  );
}
