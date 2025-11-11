import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

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
const handleViewDevices = async (operator_id: string) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/operators/${operator_id}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const devices = data.data.devices;

    const devicesHTML =
      devices.length > 0
        ? `<div style="overflow-x:auto; max-height:400px;">
             <table style="
               width:100%; 
               border-collapse: collapse; 
               font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
               font-size:12px;
             ">
               <thead>
                 <tr style="background-color:#343a40; color:#fff; text-align:left;">
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">Device ID</th>
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">IMEI</th>
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">Type</th>
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">Battery</th>
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">Firmware</th>
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">SIM</th>
                   <th style="padding:6px 8px; border:1px solid #dee2e6;">Status</th>
                 </tr>
               </thead>
               <tbody>
                 ${devices
                   .map(
                     (d: any) => `
                     <tr style="border-bottom:1px solid #dee2e6; background-color:#f8f9fa;">
                       <td style="padding:4px 8px;">${d.device_id || "N/A"}</td>
                       <td style="padding:4px 8px;">${d.imei || "N/A"}</td>
                       <td style="padding:4px 8px;">${d.device_type || "N/A"}</td>
                       <td style="padding:4px 8px;">${
                         d.battery_level !== null && d.battery_level !== undefined
                           ? d.battery_level + "%"
                           : "N/A"
                       }</td>
                       <td style="padding:4px 8px;">${d.firmware_version || "N/A"}</td>
                       <td style="padding:4px 8px;">${d.sim_number || "N/A"}</td>
                       <td style="padding:4px 8px; color:${
                         d.status ? "#28a745" : "#dc3545"
                       }; font-weight:600;">${d.status ? "Active" : "Inactive"}</td>
                     </tr>
                   `
                   )
                   .join("")}
               </tbody>
             </table>
           </div>`
        : `<div style="font-size:12px; color:#6c757d; text-align:center;">No devices assigned.</div>`;

    Swal.fire({
      title: "Assigned Devices",
      html: devicesHTML,
      width: 800,
      confirmButtonText: "Close",
      customClass: { popup: "rounded-xl shadow-lg p-3" },
      scrollbarPadding: false,
      showCloseButton: true,
    });
  } catch (err: any) {
    Swal.fire({ icon: "error", title: "Error", text: err.message });
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
      ...swalBaseConfig,
      title: `<h3 style="font-size:16px; font-weight:600; margin-bottom:8px;">Operator Details</h3>`,
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div><b>Name:</b> ${o.name}</div>
            <div><b>Email:</b> ${o.email}</div>
            <div><b>Phone:</b> ${o.phone || "N/A"}</div>
            <div><b>Registration #:</b> ${o.registration_number}</div>
            <div><b>Company:</b> ${o.company_name || "N/A"}</div>
            <div><b>City/State:</b> ${o.city || "N/A"}, ${o.state || "N/A"}</div>
            <div><b>Postal:</b> ${o.postal_code || "N/A"}</div>
            <div><b>Country:</b> ${o.country || "N/A"}</div>
            <div><b>Status:</b> ${
              o.status
                ? '<span style="color:#10b981;font-weight:600;">Active</span>'
                : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
            }</div>
          </div>

          <hr style="margin:5px 0;border:none;border-top:1px solid ${isDark ? "#374151" : "#e5e7eb"};" />

          <h4><b>Assigned Details:</b></h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div><b>Assigned Drivers:</b> ${assignedDriversHTML}</div>
            <div><b>Assigned Devices:</b> ${assignedDevicesHTML}</div>
            <div style="grid-column:span 2;"><b>Assigned Vehicles:</b> ${assignedVehiclesHTML}</div>
          </div>
        </div>
      `,
      confirmButtonText: "Close",
      width: 550,
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


   <div className="overflow-x-auto no-scrollbar">
  <table className="min-w-full border-collapse table-fixed">
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-700">
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
      className="flex-1 border rounded-lg px-2 py-1.5 text-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      style={{ minWidth: "120px" }}
      disabled={devices.filter((d) => !(d as any).assigned_operator_id).length === 0} // disable if none
    >
      {devices.filter((d) => !(d as any).assigned_operator_id).length > 0 ? (
        <>
          <option value="" disabled className="text-gray-500">
            Select device
          </option>
          {devices
            .filter((d) => !(d as any).assigned_operator_id)
            .map((d) => (
              <option
                key={d.device_id}
                value={d.device_id}
                style={{ color: "#1f2937", backgroundColor: "#ffffff" }}
              >
                {d.device_id}
              </option>
            ))}
        </>
      ) : (
        <option value="" disabled>
          No unassigned devices
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
                <button
                  onClick={() => toggleStatus(o.operator_id)}
                  className={`text-xs px-3 py-1 rounded font-medium transition ${
                    o.status
                      ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
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
      </div>
    </>
  );
}
