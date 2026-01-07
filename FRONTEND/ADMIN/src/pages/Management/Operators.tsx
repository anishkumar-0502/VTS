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
    company_name?: string;  
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
const [formStep, setFormStep] = useState(1);
const emptyOperatorForm = {
  name: "",
  email: "",
  phone_number: "",
  registration_number: "",
  company_name: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

const [operatorForm, setOperatorForm] = useState<any>({
  name: "",
  email: "",
  phone_number: "",
  registration_number: "",
  company_name: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
});

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

const stepFields: Record<number, string[]> = {
  1: ["name", "email", "phone_number", "registration_number"],
  2: ["company_name", "address", "city", "state"],
  3: ["postal_code", "country"],
};


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
   const body = {
  name: operatorForm.name,
  email: operatorForm.email,
  phone_number: operatorForm.phone_number,
  registration_number: operatorForm.registration_number,
  company_name: operatorForm.company_name,
  address: operatorForm.address,
  city: operatorForm.city,
  state: operatorForm.state,
  postal_code: operatorForm.postal_code,
  country: operatorForm.country,
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
        padding:20px 24px;
        background:linear-gradient(135deg,#4f46e5,#6366f1);
        display:flex;
        align-items:center;
        gap:14px;
      ">
        <div style="
          width:56px;height:56px;border-radius:16px;
          background:rgba(255,255,255,.22);
          display:flex;align-items:center;justify-content:center;
          font-size:24px;font-weight:800;color:white;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
        ">
          ${o.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style="font-size:20px;font-weight:800;color:white">
            ${o.name}
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,.85)">
            Operator Profile
          </div>
        </div>
      </div>

      <!-- CONTENT (UNCHANGED) -->
      <div style="position:relative; padding:24px; color:${darkMode ? "#e5e7eb" : "#111827"};">

        <!-- BASIC INFO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px">
          <div><b>Email:</b> ${o.email}</div>
          <div><b>Phone:</b> ${o.phone || "N/A"}</div>
          <div><b>Registration #:</b> ${o.registration_number || "N/A"}</div>
          <div><b>Company:</b> ${o.company_name || "N/A"}</div>
          <div><b>Country:</b> ${o.country || "N/A"}</div>
          <div>
            <b>Status:</b>
            ${
              o.status
                ? `<span style="margin-left:6px;background:#10b98122;color:#10b981;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600">Active</span>`
                : `<span style="margin-left:6px;background:#ef444422;color:#ef4444;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600">Inactive</span>`
            }
          </div>
        </div>

        <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};margin:18px 0"/>

        <!-- ASSIGNED DETAILS -->
        <b style="font-size:15px">Assigned Details</b>

        <table style="
          width:100%;
          border-collapse:collapse;
          margin-top:12px;
          font-size:14px;
          border:1px solid ${darkMode ? "#4b5563" : "#ddd"};
        ">
          <thead>
            <tr style="background:${darkMode ? "#1f2937" : "#f3f4f6"}">
              <th style="padding:10px;text-align:left">Drivers</th>
              <th style="padding:10px;text-align:left">Devices</th>
              <th style="padding:10px;text-align:left">Vehicles</th>
            </tr>
          </thead>
          <tbody>
  ${(() => {
    const hasData =
      o.drivers.length > 0 ||
      o.devices.length > 0 ||
      o.vehicles.length > 0;

    // 👉 Case 1: NO assigned details at all
    if (!hasData) {
      return `
        <tr>
          <td colspan="3" style="
            padding:14px;
            text-align:center;
            color:${darkMode ? "#9ca3af" : "#6b7280"};
            font-style:italic;
          ">
            No assigned drivers, devices, or vehicles
          </td>
        </tr>
      `;
    }

    // 👉 Case 2: Normal data rendering
    const maxRows = Math.max(
      o.drivers.length,
      o.devices.length,
      o.vehicles.length
    );

    let rows = "";
    for (let i = 0; i < maxRows; i++) {
      rows += `
        <tr>
          <td style="padding:8px 10px">
            ${o.drivers[i]?.name || "—"}
          </td>
          <td style="padding:8px 10px">
            ${o.devices[i]?.device_id || "—"}
          </td>
          <td style="padding:8px 10px">
            ${o.vehicles[i]?.vehicle_number || "—"}
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
  </div>
  `,
  customClass: { popup: "shadow-none" }
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
          ${o.name ? o.name.charAt(0).toUpperCase() : "O"}
        </div>

        <div>
          <div style="font-size:19px;font-weight:800;color:white">
            ${o.name}
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,.85)">
            Operator · Devices
          </div>
        </div>
      </div>

      <!-- CONTENT (UNCHANGED) -->
      <div style="position:relative; padding:22px; color:${textColor} !important;">

        <!-- BASIC INFO -->
        <div style="display:flex; flex-direction:column; gap:8px; font-size:14px;">
          <div><b>Email :</b> ${o.email || "N/A"}</div>
          <div><b>Phone :</b> ${o.phone || "N/A"}</div>
          <div style="display:flex; align-items:center; gap:6px;">
            <b>Status :</b>
            ${
              o.status
                ? `<span style="background:#10b98122;color:#10b981;padding:3px 8px;border-radius:6px;font-size:12px">Active</span>`
                : `<span style="background:#ef444422;color:#ef4444;padding:3px 8px;border-radius:6px;font-size:12px">Inactive</span>`
            }
          </div>
        </div>

        <hr style="border:none;border-top:1px solid ${borderColor};margin:14px 0"/>

        <!-- DEVICES -->
        <div style="font-size:15px;font-weight:600;margin-bottom:10px">
          Assigned Devices
        </div>

        <div style="max-height:300px; overflow:auto; border-radius:6px;">
          ${devicesHTML}
        </div>

      </div>
    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" }
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

            {!showForm && (
            <Button
              size="sm"
              onClick={() => {
                setEditingOperator(null);
                  setOperatorForm(emptyOperatorForm); 
                   setFormStep(1);  
                setShowForm(true);
              }}
            >
              + Add Operator
            </Button>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingOperator ? "Edit Operator" : "Add New Operator"}
              </h3>

          <form onSubmit={handleSubmit}>
  {/* STEP INDICATOR */}
  <div className="flex items-center gap-2 mb-6">
    {[1, 2, 3].map((s) => (
      <div
        key={s}
        className={`h-2 flex-1 rounded-full transition ${
          formStep >= s
            ? "bg-indigo-500"
            : "bg-gray-300 dark:bg-gray-600"
        }`}
      />
    ))}
  </div>

  {/* STEP FIELDS */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {stepFields[formStep].map((field) => (
      <div key={field}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {field.replace("_", " ")}
        </label>
       <input
  name={field}
  type={field === "email" ? "email" : "text"}
  value={operatorForm[field]}
  onChange={(e) =>
    setOperatorForm({
      ...operatorForm,
      [field]: e.target.value,
    })
  }
  required
  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2
  dark:border-gray-600 dark:bg-gray-700 dark:text-white
  focus:ring-2 focus:ring-indigo-500"
/>

      </div>
    ))}
  </div>

  {/* NAVIGATION */}
  <div className="flex justify-between items-center mt-6">
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={formStep === 1}
      onClick={() => setFormStep((s) => s - 1)}
    >
      Back
    </Button>

    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
       onClick={() => {
  setShowForm(false);
  setEditingOperator(null);
  setOperatorForm(emptyOperatorForm); 
  setFormStep(1);

}}

      >
        Cancel
      </Button>

      {formStep < 3 ? (
        <Button
          type="button"
          size="sm"
          onClick={() => setFormStep((s) => s + 1)}
        >
          Next
        </Button>
      ) : (
        <Button size="sm" type="submit">
          {editingOperator ? "Update Operator" : "Create Operator"}
        </Button>
      )}
    </div>
  </div>
</form>

            </div>
          )}

         {!showForm && (
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
 <table className="w-full text-sm">
  {/* <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
    <tr className="text-gray-600 dark:text-gray-300">
      <th className="px-4 py-3 text-left">Operator</th>
      <th className="px-4 py-3 text-left">Phone</th>
      <th className="px-4 py-3 text-left">Assign Device</th>
      <th className="px-4 py-3 text-left">Status</th>
      <th className="px-4 py-3 text-right">Actions</th>
    </tr>
  </thead> */}

  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            <tr className="text-gray-600 dark:text-gray-300">
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
      Operator
    </th>
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
      Phone
    </th>
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
      Assign Device
    </th>
    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
      Status
    </th>
    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
      Actions
    </th>
  </tr>
</thead>


  <tbody>
    {operators.length > 0 ? (
      operators.map((o, idx) => (
        <tr
          key={o.operator_id}
          className={`border-t dark:border-gray-700
          ${idx % 2 === 0
            ? "bg-white dark:bg-gray-900"
            : "bg-gray-50 dark:bg-gray-800"}
          hover:bg-blue-50/50 dark:hover:bg-gray-700 transition`}
        >
          {/* OPERATOR */}
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500 text-white
                flex items-center justify-center font-semibold">
                {o.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {o.name}
                </p>
                <p className="text-xs text-gray-500">
                  {o.email}
                </p>
              </div>
            </div>
          </td>

          {/* PHONE */}
          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
            {o.phone || o.phone_number || "—"}
          </td>

          {/* ASSIGN DEVICE */}
          <td className="px-4 py-3 min-w-[180px]">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleViewDevices(o.operator_id)}
                className="p-2 rounded-md text-blue-400 dark:text-gray-300
                hover:bg-blue-50 hover:text-blue-600
                dark:hover:bg-blue-900/40 transition"
              >
                <EyeIcon />
              </button>

              <select
                defaultValue=""
                onChange={(e) => assignDevice(o.operator_id, e.target.value)}
                className="w-full rounded-md border px-2 py-1 text-xs
                dark:bg-gray-800 dark:text-white
                border-gray-300 dark:border-gray-600"
              >
                <option value="" disabled>Select</option>
                {devices
                  .filter((d: any) => !d.assigned_operator_id)
                  .map((d) => (
                    <option key={d.device_id} value={d.device_id}>
                      {d.device_id}
                    </option>
                  ))}
              </select>
            </div>
          </td>

          {/* STATUS */}
          <td className="px-4 py-3">
            <span
              className={`text-xs font-medium px-2 py-1 rounded
              ${o.status
                ? "text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              {o.status ? "Active" : "Inactive"}
            </span>
          </td>



          {/* ACTIONS */}
          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">

                 {/* TOGGLE STATUS */}
              <button
                title="Toggle Status"
                onClick={() => toggleStatus(o.operator_id)}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {o.status ? <DeactivateIcon /> : <ActivateIcon />}
              </button>
              {/* VIEW */}
              <button
                title="View Operator"
                onClick={() => handleView(o.operator_id)}
                className="p-2 rounded-md text-blue-400 dark:text-gray-300
                hover:bg-blue-50 hover:text-blue-600
                dark:hover:bg-blue-900/40 transition"
              >
                <EyeIcon />
              </button>

              {/* EDIT */}
              <button
                title="Edit Operator"
              onClick={() => {
  setEditingOperator(o);

  setOperatorForm({
    name: o.name || "",
    email: o.email || "",
    phone_number: o.phone || o.phone_number || "",
    registration_number: o.registration_number || "",
    company_name: o.company_name || "",
    address: o.address || "",
    city: o.city || "",
    state: o.state || "",
    postal_code: o.postal_code || "",
    country: o.country || "",
  });

  setFormStep(1);
  setShowForm(true);
}}


                className="p-2 rounded-md text-gray-600 dark:text-gray-300
                hover:bg-indigo-50 hover:text-indigo-600
                dark:hover:bg-indigo-900/40 transition"
              >
                <EditIcon />
              </button>

           
            </div>
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan={5} className="text-center py-8 text-gray-500">
          No operators found
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
)}



      </div>
      </div>
    </>
  );
}
