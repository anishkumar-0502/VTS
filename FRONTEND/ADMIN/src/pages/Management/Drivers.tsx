import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import PageShimmer from "../../components/common/PageShimmer";

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone_number: string;
  license_number: string;
  license_expiry: string;
  status: boolean;
  driver_profile?: {
    driver_id: string;
    assigned_vehicle_id?: string | null;
  };

  // ⬇ ADD THIS
  assigned_vehicle?: {
    vehicle_number?: string;
    vehicle_type?: string;
    capacity?: number;
    current_status?: string;
  } | null;
}


const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ManageDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
const [page, setPage] = useState(1);
const [pageSize] = useState(10); // you can change this
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    license_number: "",
    license_expiry: "",
  });

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
  // ======================
  // FETCH DRIVERS
  // ======================
const fetchDrivers = async (reset = false) => {
  try {
    if (reset) {
      setPage(1);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const res = await fetch(
      `${API_BASE_URL}/operator/drivers/list?page=${reset ? 1 : page}&limit=${pageSize}`,
      { headers: authHeaders }
    );

    const data = await res.json();

    if (res.ok) {
      const newDrivers = data.data || [];

    setDrivers(prev => {
  const merged = reset ? newDrivers : [...prev, ...newDrivers];

  return Array.from(
    new Map(merged.map((d: Driver) => [d._id, d])).values()
  ) as Driver[];
});


      setHasMore(newDrivers.length === pageSize);
    } else {
      setError(data.message || "Failed to load drivers");
    }
  } catch (err) {
    console.error(err);
    setError("Error fetching drivers");
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
};



  useEffect(() => {
    fetchDrivers(true);
    setPage(1);
  }, []);

  // ======================
  // SAVE (CREATE / UPDATE)
  // ======================
  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone_number) {
      Swal.fire("Validation Error", "Please fill all required fields.", "warning");
      return;
    }

    try {
      let res;
      if (editingDriver) {
        res = await fetch(
          `${API_BASE_URL}/operator/drivers/${editingDriver.driver_profile?.driver_id}/update`,
          {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify(formData),
          }
        );
      } else {
        res = await fetch(`${API_BASE_URL}/operator/drivers/create`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(formData),
        });
      }

      const data = await res.json();

      if (res.ok) {
        showSuccess(editingDriver ? "Updated Successfully!" : "Driver Created!");
        setShowForm(false);
        setEditingDriver(null);
        resetForm();
        fetchDrivers();
      } else {
        Swal.fire("Error", data.message || "Failed to save driver", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "An error occurred while saving driver.", "error");
    }
  };

  // ======================
  // VIEW DRIVER DETAILS
  // ======================
const handleView = async (driver_id: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/operator/drivers/${driver_id}/view`, {
      headers: authHeaders,
    });
    const data = await res.json();

    if (!res.ok || !data.data) {
      throw new Error(data.message || "Failed to fetch driver details");
    }

    const d = data.data;
    const v = d.assigned_vehicle || {};
    const darkMode = document.documentElement.classList.contains("dark");

    const formatDate = (dateStr: string) => (dateStr ? new Date(dateStr).toLocaleDateString() : "N/A");

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
              ${d.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:20px; font-weight:700; color:${darkMode ? "#e5e7eb" : "#111827"};">
                ${d.name}
              </div>
              <div style="font-size:13px; color:${darkMode ? "#9ca3af" : "#6b7280"};">
                Driver Details
              </div>
            </div>
          </div>

          <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:12px 0;" />

          <!-- Driver Info -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${infoRow("Email", d.email)}
            ${infoRow("Phone Number", d.phone_number)}
            ${infoRow("License Number", d.license_number)}
            ${infoRow("License Expiry", formatDate(d.license_expiry))}
            ${infoRow("Assigned Vehicle Number", v.vehicle_number)}
            ${infoRow("Vehicle Type", v.vehicle_type)}
            ${infoRow("Capacity", v.capacity)}
            ${infoRow("Vehicle Status", v.current_status)}
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
      text: err.message || "Failed to view driver",
      confirmButtonColor: "#ef4444",
    });
  }
};




  // ======================
  // TOGGLE DRIVER STATUS
  // ======================
const handleToggleStatus = async (driver: Driver) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/operator/drivers/${driver.driver_profile?.driver_id}/deactivate`,
      {
        method: "PUT",
        headers: authHeaders,
      }
    );

    const data = await res.json();

    if (res.ok) {
      showSuccess(driver.status ? "Driver Deactivated" : "Driver Activated");

      // ⬇ FIX HERE
      fetchDrivers(true); // Reset pagination & replace list
      setPage(1);
    } else {
      Swal.fire("Error", data.message || "Failed to change driver status", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Unable to change driver status", "error");
  }
};


  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      phone_number: String(driver.phone_number),
      license_number: driver.license_number,
      license_expiry: driver.license_expiry.split("T")[0],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone_number: "",
      license_number: "",
      license_expiry: "",
    });
  };

if (loading)
  return (
    <PageShimmer />
  );

  return (
    <>
      <PageMeta title="Driver Management | Operator" description="Manage Drivers" />
      <div>
        <PageBreadCrumb pageTitle="Drivers Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Drivers
            </h2>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setEditingDriver(null);
                setShowForm(true);
              }}
               disabled={showForm}
  className={showForm ? "opacity-50 cursor-not-allowed" : ""}
            >
              Add Driver
            </Button>
          </div>

          {/* ===================== FORM ===================== */}
          {showForm && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingDriver ? "Edit Driver" : "Create Driver"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Name", name: "name" },
                  { label: "Email", name: "email" },
                  { label: "Phone Number", name: "phone_number" },
                  { label: "License Number", name: "license_number" },
                  { label: "License Expiry", name: "license_expiry", type: "date" },
                ].map(({ label, name, type }) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {label}
                    </label>
                    <input
                      type={type || "text"}
                      name={name}
                      value={(formData as any)[name]}
                      onChange={(e) =>
                        setFormData({ ...formData, [name]: e.target.value })
                      }
                      placeholder={label}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDriver(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  {editingDriver ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}

          {/* ===================== TABLE ===================== */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {["Name", "Email", "Phone", "Assigned vehicle", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr
                    key={driver._id}
                    className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <td className="px-2 py-2">{driver.name}</td>
                    <td className="px-2 py-2">{driver.email}</td>
                    <td className="px-2 py-2">{driver.phone_number}</td>
                    <td className="px-2 py-2">
  {driver.assigned_vehicle?.vehicle_number || "Not Assigned"}
</td>
                    <td className="px-2 py-2">
                       <span
    className={`px-3 py-1 rounded-full text-xs font-medium ${
      driver.status
        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    }`}
  >
                        {driver.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                         <button
        onClick={() => handleToggleStatus(driver)}
      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
      title={driver.status ? "Deactivate User" : "Activate User"}
    >
      {driver.status ? <DeactivateIcon /> : <ActivateIcon />}
    </button>
                        <button
                          onClick={() =>
                            handleView(driver.driver_profile?.driver_id || "")
                          }
                           className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded 
                 hover:bg-gray-100 font-normal 
                 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"
    >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(driver)}
                           className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded 
                 hover:bg-blue-100 font-normal 
                 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
    >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {drivers.length === 0 && !error && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No drivers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {hasMore && (
  <div className="flex justify-center py-4">
    <button
      disabled={loadingMore}
      onClick={() => {
        setPage(prev => prev + 1);
        fetchDrivers();
      }}
      className="px-4 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
