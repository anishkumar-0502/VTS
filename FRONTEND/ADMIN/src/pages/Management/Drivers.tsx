import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

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
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ManageDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

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

  // ======================
  // FETCH DRIVERS
  // ======================
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/operator/drivers/list`, {
        headers: authHeaders,
      });
      const data = await res.json();

      if (res.ok) {
        setDrivers(data.data || []);
      } else {
        setError(data.message || "Failed to load drivers");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
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
        Swal.fire({
          icon: "success",
          title: editingDriver ? "Updated Successfully!" : "Driver Created!",
          timer: 1500,
          showConfirmButton: false,
        });
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

    if (res.ok && data.data) {
      const d = data.data;
      const v = d.assigned_vehicle || {};

      Swal.fire({
        title: `<h2 class='text-base font-semibold mb-2 text-gray-800'>Driver Details</h2>`,
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            text-align: left;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
            gap: 6px;
          ">

            <p><b>Name:</b> ${d.name}</p>
            <p><b>Email:</b> ${d.email}</p>
            <p><b>Phone Number:</b> ${d.phone_number}</p>
            <p><b>Status:</b> ${
            d.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</p>
            
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 6px 0;">

            <p><b>License Number:</b> ${d.license_number || "N/A"}</p>
            <p><b>License Expiry:</b> ${
              d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "N/A"
            }</p>

            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 6px 0;">

            <p><b>Assigned Vehicle Number:</b> ${v.vehicle_number || "Not Assigned"}</p>
            <p><b>Vehicle Type:</b> ${v.vehicle_type || "N/A"}</p>
            <p><b>Route Name:</b> ${v.route_name || "N/A"}</p>
            <p><b>Capacity:</b> ${v.capacity || "N/A"}</p>
            <p><b>Vehicle Status:</b> ${v.current_status || "N/A"}</p>
          </div>
        `,
        width: 420,
        confirmButtonText: "Close",
        confirmButtonColor: "#2563eb",
      });
    } else {
      Swal.fire("Error", data.message || "Failed to fetch driver details", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Unable to fetch driver details", "error");
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
        Swal.fire({
          icon: "success",
          title: driver.status ? "Driver Deactivated" : "Driver Activated",
          showConfirmButton: false,
          timer: 1500,
        });
        fetchDrivers();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading drivers...</p>
      </div>
    );
  }

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
                  {["Name", "Email", "Phone", "License No", "Status", "Actions"].map((h) => (
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
                    <td className="px-2 py-2">{driver.license_number}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          driver.status
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {driver.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleView(driver.driver_profile?.driver_id || "")
                          }
                          className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(driver)}
                          className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(driver)}
                          className={`text-xs px-3 py-1 rounded ${
                            driver.status
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {driver.status ? "Deactivate" : "Activate"}
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
          </div>
        </div>
      </div>
    </>
  );
}
