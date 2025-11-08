  import React, { useState, useEffect, useRef } from "react";
  import Swal from "sweetalert2";
  import PageMeta from "../../components/common/PageMeta";
  import PageBreadCrumb from "../../components/common/PageBreadCrumb";

  const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

  interface Driver {
    driver_id: string;
    name?: string;
  }

  interface Vehicle {
    vehicle_id: string;
    vehicle_number?: string;
  }

  interface AssignedDriver {
    driver_id: string;
    vehicle_id: string;
    assigned_at?: string;
    status?: boolean;
  }

  export default function AssignDriverToVehicle() {
    const [showForm, setShowForm] = useState(false);
    const [assignments, setAssignments] = useState<AssignedDriver[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [formData, setFormData] = useState({ driver_id: "", vehicle_id: "" });
    const [loading, setLoading] = useState(false);
    const didFetch = useRef(false);

    /** Fetch drivers list */
    const fetchDrivers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/operator/drivers/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && !data.error && data.data) setDrivers(data.data);
      } catch {
        Swal.fire("Error", "Failed to load drivers", "error");
      }
    };

    /** Fetch vehicles list */
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/operator/vehicles/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && !data.error && data.data) setVehicles(data.data);
      } catch {
        Swal.fire("Error", "Failed to load vehicles", "error");
      }
    };

    /** Load data once */
    useEffect(() => {
      if (didFetch.current) return;
      fetchDrivers();
      fetchVehicles();
      didFetch.current = true;
    }, []);

    /** Handle form submission */
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.driver_id || !formData.vehicle_id) {
        Swal.fire("Validation", "Please select both a driver and a vehicle", "warning");
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const res = await fetch(`${BASE_URL}/operator/assignments/driver-to-vehicle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.message || "Assignment failed");

        Swal.fire("Success", "Driver assigned to vehicle successfully!", "success");
        setAssignments([
          ...assignments,
          {
            ...formData,
            assigned_at: new Date().toISOString(),
            status: true,
          },
        ]);
        setFormData({ driver_id: "", vehicle_id: "" });
        setShowForm(false);
      } catch (err: any) {
        Swal.fire("Error", err.message || "Failed to assign driver", "error");
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <PageMeta
          title="Assign Driver to Vehicle | VTS Admin"
          description="Assign and manage drivers for vehicles"
        />
        <div className="p-6 bg-gray-50 min-h-screen">
          <PageBreadCrumb pageTitle="Assign Driver to Vehicle" />

          <div className="max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-md p-8 transition">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Driver Assignments</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className={`px-5 py-2 rounded-lg font-medium text-white transition ${
                  showForm ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {showForm ? "Close Form" : "+ New Assignment"}
              </button>
            </div>

            {/* Assignment Form */}
            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border border-indigo-100 rounded-xl shadow-sm"
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Assign New Driver</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Driver Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Driver
                    </label>
                    <select
                      value={formData.driver_id}
                      onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Select Driver --</option>
                     {drivers.map((d: any) => (
  <option
    key={d.driver_profile?.driver_id || d._id}
    value={d.driver_profile?.driver_id || d._id}
  >
    {d.driver_profile?.name || d.name || d.driver_profile?.driver_id}
  </option>
))}
                    </select>
                  </div>

                  {/* Vehicle Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Vehicle
                    </label>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.vehicle_number || v.vehicle_id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {loading ? "Assigning..." : "Assign Driver"}
                  </button>
                </div>
              </form>
            )}

            {/* Assignment Table */}
            {assignments.length === 0 ? (
              <div className="text-center text-gray-500 py-10 italic">
                No driver assignments yet.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] rounded-lg border border-gray-200 shadow-inner">
                <table className="min-w-full text-sm text-left text-gray-700">
                  <thead className="bg-indigo-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Driver ID</th>
                      <th className="px-4 py-3 font-semibold">Vehicle ID</th>
                      <th className="px-4 py-3 font-semibold">Assigned At</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition">
                        <td className="px-4 py-3">{a.driver_id}</td>
                        <td className="px-4 py-3">{a.vehicle_id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.assigned_at
                            ? new Date(a.assigned_at).toLocaleString()
                            : "Just now"}
                        </td>
                        <td className="px-4 py-3">
                          {a.status ? (
                            <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
