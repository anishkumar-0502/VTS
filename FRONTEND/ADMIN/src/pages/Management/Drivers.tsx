import { useEffect, useState } from "react";
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
  padding: "0",
  background: "transparent",
  html: `
  <div style="
    border-radius:26px;
    padding:2px;
    background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5);
    box-shadow:0 30px 80px rgba(0,0,0,.45);
  ">
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
          width:56px;
          height:56px;
          border-radius:16px;
          background:rgba(255,255,255,.22);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:24px;
          font-weight:800;
          color:white;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
        ">
          ${d.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-size:20px; font-weight:800; color:white;">
            ${d.name}
          </div>
          <div style="font-size:13px; color:rgba(255,255,255,.85);">
            Driver Profile
          </div>
        </div>
      </div>

     <!-- BODY -->
<div style="
  position:relative;
  padding:24px;
  color:${darkMode ? "#e5e7eb" : "#111827"};
  display:flex;
  flex-direction:column;
  gap:12px;
  font-size:14px;
  line-height:1.6;
">

  <div><b>Email:</b> ${d.email}</div>

  <div><b>Phone Number:</b> ${d.phone_number}</div>

  <div><b>License Number:</b> ${d.license_number}</div>

  <div><b>License Expiry:</b> ${formatDate(d.license_expiry)}</div>

  <div><b>Assigned Vehicle Number:</b> ${v.vehicle_number ?? "N/A"}</div>

  <div><b>Vehicle Type:</b> ${v.vehicle_type ?? "N/A"}</div>

  <div><b>Capacity:</b> ${v.capacity ?? "N/A"}</div>

  <div><b>Vehicle Status:</b> ${v.current_status ?? "N/A"}</div>

  <div>
    <b>Status:</b>
    ${
      d.status
        ? `<span style="
            margin-left:6px;
            background:#10b98122;
            color:#10b981;
            padding:4px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
          ">Active</span>`
        : `<span style="
            margin-left:6px;
            background:#ef444422;
            color:#ef4444;
            padding:4px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
          ">Inactive</span>`
    }
  </div>

</div>

    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" },
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


  // const handleEdit = (driver: Driver) => {
  //   setEditingDriver(driver);
  //   setFormData({
  //     name: driver.name,
  //     email: driver.email,
  //     phone_number: String(driver.phone_number),
  //     license_number: driver.license_number,
  //     license_expiry: driver.license_expiry.split("T")[0],
  //   });
  //   setShowForm(true);
  // };

  const handleEdit = (driver: Driver) => {
  setEditingDriver(driver);

  setFormData({
    name: driver.name || "",
    email: driver.email || "",
    phone_number: String(driver.phone_number || ""),
    license_number: driver.license_number || "",
    license_expiry:
      driver.license_expiry && driver.license_expiry.includes("T")
        ? driver.license_expiry.split("T")[0]
        : driver.license_expiry || "",
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
             {!showForm && (
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
             )}
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
             {!showForm && (
                  <div className="max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-auto no-scrollbar">
  <table className="w-full text-sm">
    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
      <tr className="text-gray-600 dark:text-gray-300">
        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
          Name
        </th>
        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
          Email
        </th>
        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
          Phone
        </th>
        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
          Assigned Vehicle
        </th>
        <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
          Status
        </th>
        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
          Actions
        </th>
      </tr>
    </thead>

    <tbody>
      {drivers.map((driver, idx) => (
        <tr
          key={driver._id}
          className={`border-t dark:border-gray-700
          ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
          hover:bg-blue-50/50 dark:hover:bg-gray-700 transition`}
        >
          {/* Name */}
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                {driver.name?.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {driver.name}
              </span>
            </div>
          </td>

          {/* Email */}
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
            {driver.email}
          </td>

          {/* Phone */}
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
            {driver.phone_number}
          </td>

          {/* Vehicle */}
          <td className="px-4 py-3">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
              {driver.assigned_vehicle?.vehicle_number || "Not Assigned"}
            </span>
          </td>

          {/* Status */}
          <td className="px-4 py-3 text-center">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                driver.status
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              {driver.status ? "Active" : "Inactive"}
            </span>
          </td>

          {/* Actions */}
          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">
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
                className="p-2 rounded-md text-blue-400 dark:text-gray-300
                hover:bg-blue-50 hover:text-blue-600
                dark:hover:bg-blue-900/40 transition"
              >
                <EyeIcon />
              </button>

              <button
                onClick={() => handleEdit(driver)}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300
                hover:bg-indigo-50 hover:text-indigo-600
                dark:hover:bg-indigo-900/40 transition"
              >
                <EditIcon />
              </button>
            </div>
          </td>
        </tr>
      ))}

      {drivers.length === 0 && !error && (
        <tr>
          <td
            colSpan={6}
            className="text-center py-8 text-gray-500 dark:text-gray-400"
          >
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
          setPage((prev) => prev + 1);
          fetchDrivers();
        }}
        className="px-4 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loadingMore ? "Loading..." : "Load More"}
      </button>
    </div>
  )}
</div>

             )}
        </div>
      </div>
    </>
  );
}
