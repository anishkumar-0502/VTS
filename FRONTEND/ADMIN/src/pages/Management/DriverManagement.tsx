import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import { driversAPI } from "../../services/api";

interface Driver {
  _id: string;
  full_name: string;
  email: string;
  phone_number: string;
  license_number: string;
  status: boolean;
  created_at: string;
}

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    license_number: "",
    password: "",
    status: true,
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await driversAPI.getAll();
      if (response.success && response.data) {
        setDrivers(response.data.drivers || []);
        setError("");
      } else {
        setError(response.message || "Failed to fetch drivers");
      }
    } catch {
      setError("Error fetching drivers");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      full_name: driver.full_name,
      email: driver.email,
      phone_number: driver.phone_number,
      license_number: driver.license_number,
      password: "",
      status: driver.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (driverId: string) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        const response = await driversAPI.delete(driverId);
        if (response.success) {
          setDrivers(drivers.filter((d) => d._id !== driverId));
          setError("");
        } else {
          setError(response.message || "Failed to delete driver");
        }
      } catch {
        setError("Error deleting driver");
      }
    }
  };

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.phone_number.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      const submitData = { ...formData };
      if (!submitData.password && !editingDriver) {
        setError("Password is required for new drivers");
        return;
      }
      if (editingDriver && !submitData.password) {
        delete (submitData as any).password;
      }

      let response;
      if (editingDriver) {
        response = await driversAPI.update(editingDriver._id, submitData);
      } else {
        response = await driversAPI.create(submitData);
      }

      if (response.success) {
        await fetchDrivers();
        setShowForm(false);
        setEditingDriver(null);
        setFormData({
          full_name: "",
          email: "",
          phone_number: "",
          license_number: "",
          password: "",
          status: true,
        });
        setError("");
      } else {
        setError(response.message || "Failed to save driver");
      }
    } catch {
      setError("Error saving driver");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading drivers...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Drivers Management | VTS Admin"
        description="Manage drivers"
      />
      <div>
        <PageBreadCrumb pageTitle="Drivers" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage Drivers
            </h2>
            <Button
              onClick={() => {
                setEditingDriver(null);
                setFormData({
                  full_name: "",
                  email: "",
                  phone_number: "",
                  license_number: "",
                  password: "",
                  status: true,
                });
                setShowForm(true);
              }}
              size="sm"
            >
              Add Driver
            </Button>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingDriver ? "Edit Driver" : "Create New Driver"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {(!editingDriver || true) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password {editingDriver && "(leave blank to keep current)"}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingDriver(null);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm">
                  {editingDriver ? "Update" : "Create"} Driver
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    License
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">
                      {driver.full_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {driver.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {driver.phone_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {driver.license_number}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          driver.status
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {driver.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(driver)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(driver._id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {drivers.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">No drivers found</div>
          )}
        </div>
      </div>
    </>
  );
}
