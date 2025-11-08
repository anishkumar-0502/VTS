import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";

// ✅ Import Leaflet marker images
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface RoutePoint {
  name: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  order: number;
  arrival_time?: string;
}

interface StandingLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface Vehicle {
  _id: string;
  vehicle_number: string;
  vehicle_type: string;
  route_name?: string;
  capacity?: number;
  registration_number?: string;
  chassis_number?: string;
  color?: string;
  seating_capacity?: number;
  route_points?: RoutePoint[];
  standing_location?: StandingLocation | null;
  status: boolean;
  current_status?: string;
  speed?: number;
  vehicle_id?: string;
  createdAt?: string;
  updatedAt?: string;

  // optional possible assignment fields (defensive)
  assigned_device_id?: string | null;
  assigned_device?: { device_id?: string; _id?: string } | null;
  assigned_driver_id?: string | null;
  assigned_driver?: { _id?: string; name?: string } | null;
  assigned_passengers?: Array<{ _id?: string; name?: string }>;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [form, setForm] = useState({
    vehicle_number: "",
    vehicle_type: "bus",
    route_name: "",
    capacity: 0,
    registration_number: "",
    chassis_number: "",
    color: "",
    seating_capacity: 0,
  });

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [standingLocation, setStandingLocation] = useState<StandingLocation | null>(null);

  const token = localStorage.getItem("token");

  const authFetch = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/operator/vehicles/list`);
      const data = await res.json();
      if (!data.error) setVehicles(data.data || []);
      else Swal.fire("Error", data.message || "Failed to fetch vehicles", "error");
    } catch {
      Swal.fire("Error", "Unable to fetch vehicles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ---------- Map Handlers ----------
  const defaultCenter: LatLngExpression = [28.6139, 77.209]; // New Delhi

  function StandingMapHandler() {
    useMapEvents({
      click(e) {
        const name = prompt("Standing location name:", "Depot A") || "Depot A";
        setStandingLocation({
          name,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
      },
    });
    return null;
  }

  // ---------- Form ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "capacity" || name === "seating_capacity" ? Number(value) : value,
    }));
  };

  // 🟦 Stop icon
  const stopIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484167.png", // red home-style pin
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
  });

  // 🟢 Standing Location icon (current location)
  const standingIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // green location marker
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -30],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vehicle_number.trim()) {
      Swal.fire("Warning", "Vehicle number is required", "warning");
      return;
    }
    if (!standingLocation) {
      Swal.fire("Warning", "Please set standing location", "warning");
      return;
    }

    const payload = {
      ...form,
      route_points: routePoints.map((p) => ({
        name: p.name,
        landmark: p.landmark || "—",
        latitude: p.latitude,
        longitude: p.longitude,
        order: p.order,
        arrival_time: p.arrival_time,
      })),
      standing_location: standingLocation,
    };

    try {
      const url = editingVehicle
        ? `${API_BASE_URL}/operator/vehicles/${editingVehicle.vehicle_id}/update`
        : `${API_BASE_URL}/operator/vehicles/create`;
      const method = editingVehicle ? "PUT" : "POST";

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();

      if (!data.error) {
        Swal.fire("Success", data.message || "Vehicle saved successfully", "success");
        resetForm();
        setShowForm(false);
        fetchVehicles();
      } else {
        Swal.fire("Error", data.message || "Failed to save vehicle", "error");
      }
    } catch {
      Swal.fire("Error", "Something went wrong", "error");
    }
  };

  const resetForm = () => {
    setForm({
      vehicle_number: "",
      vehicle_type: "bus",
      route_name: "",
      capacity: 0,
      registration_number: "",
      chassis_number: "",
      color: "",
      seating_capacity: 0,
    });
    setRoutePoints([]);
    setStandingLocation(null);
    setEditingVehicle(null);
  };

  const handleEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setForm({
      vehicle_number: v.vehicle_number || "",
      vehicle_type: v.vehicle_type || "bus",
      route_name: v.route_name || "",
      capacity: v.capacity || 0,
      registration_number: v.registration_number || "",
      chassis_number: v.chassis_number || "",
      color: v.color || "",
      seating_capacity: v.seating_capacity || 0,
    });
    setRoutePoints(v.route_points || []);
    setStandingLocation(v.standing_location || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = async (v: Vehicle) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/operator/vehicles/${v.vehicle_id}/deactivate`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!data.error) {
        Swal.fire("Success", data.message || "Status updated", "success");
        fetchVehicles();
      } else {
        Swal.fire("Error", data.message || "Failed to update", "error");
      }
    } catch {
      Swal.fire("Error", "Unable to toggle status", "error");
    }
  };

  // ---------- View Details ----------
  const handleView = async (v: Vehicle) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/operator/vehicles/${v.vehicle_id}/view`);
      const data = await res.json();

      if (!data.error && data.data) {
        const d = data.data;

        const routeList =
          d.route_points?.length > 0
            ? d.route_points
                .map(
                  (p: RoutePoint, i: number) =>
                    `<li class="mb-1"><span class='font-medium text-gray-800'>${i + 1}. ${p.name}</span> 
                   <br/><span class='text-gray-500 text-xs'>(Lat: ${p.latitude.toFixed(4)}, Lng: ${p.longitude.toFixed(4)})</span></li>`
                )
                .join("")
            : "<li class='text-gray-500 text-sm'>No route points</li>";

        const stand = d.standing_location
          ? `${d.standing_location.name} <br/><span class='text-gray-500 text-xs'>(Lat: ${d.standing_location.latitude.toFixed(
              4
            )}, Lng: ${d.standing_location.longitude.toFixed(4)})</span>`
          : "—";

        Swal.fire({
          title: `<strong class="text-lg text-gray-800">Vehicle Details</strong>`,
          width: 500, // smaller width
          padding: "1rem",
          background: "#fff",
          html: `
          <div style="text-align:left; line-height:1.4; font-size:13px; color:#333;">
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
              <div><b>Vehicle No:</b> ${d.vehicle_number}</div>
              <div><b>Type:</b> ${d.vehicle_type}</div>
              <div><b>Route:</b> ${d.route_name || "—"}</div>
              <div><b>Color:</b> ${d.color || "—"}</div>
              <div><b>Capacity:</b> ${d.capacity || "—"}</div>
              <div><b>Seating:</b> ${d.seating_capacity || "—"}</div>
              <div><b>Registration:</b> ${d.registration_number || "—"}</div>
              <div><b>Chassis:</b> ${d.chassis_number || "—"}</div>
            </div>
            <hr class="my-2 border-gray-200"/>
            <div><b>Status:</b> ${d.status ? "✅ Active" : "❌ Inactive"}</div>
            <div><b>Current Status:</b> ${d.current_status || "offline"}</div>
            <div><b>Speed:</b> ${d.speed || 0} km/h</div>
            <div class="mt-2"><b>Standing Location:</b><br/>${stand}</div>
            <hr class="my-2 border-gray-200"/>
            <b>Route Points:</b>
            <ul style="max-height:120px; overflow-y:auto; margin-top:4px; padding-left:16px;">${routeList}</ul>
            <hr class="my-2 border-gray-200"/>
            <div class="text-xs text-gray-500 mt-1">
              <b>Created:</b> ${new Date(d.createdAt).toLocaleString()}<br/>
              <b>Updated:</b> ${new Date(d.updatedAt).toLocaleString()}
            </div>
          </div>
        `,
          confirmButtonText: "Close",
          confirmButtonColor: "#2563eb",
          showCloseButton: true,
          customClass: {
            popup: "rounded-xl shadow-md !p-2",
            title: "text-sm font-semibold",
          },
        });
      } else {
        Swal.fire("Error", data.message || "Failed to load details", "error");
      }
    } catch {
      Swal.fire("Error", "Unable to fetch vehicle details", "error");
    }
  };

  // ---------- Current Location ----------
  const [currentLocation, setCurrentLocation] = useState<LatLngExpression | null>(null);

  // ✅ NEW small helper: hook to move map center when location found
  const RecenterOnLocation = ({ location }: { location: LatLngExpression | null }) => {
    const map = useMap();
    useEffect(() => {
      if (location) {
        // 🔹 Zoom level 9 ≈ 100km view radius
        map.flyTo(location, 9, { animate: true, duration: 1.5 });
      }
    }, [location]);
    return null;
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      Swal.fire("Error", "Geolocation is not supported by your browser", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        Swal.close();
        const { latitude, longitude } = position.coords;
        const latlng: LatLngExpression = [latitude, longitude];
        setCurrentLocation(latlng);

        // ✅ set as standing location also (quietly)
        setStandingLocation({
          name: "Standing Location",
          latitude,
          longitude,
        });
      },
      (error) => {
        Swal.close();
        Swal.fire("Error", "Unable to retrieve your location", "error");
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true }
    );
  };

  const FlyToLocation = ({ location }: { location: LatLngExpression | null }) => {
    const map = useMap();

    useEffect(() => {
      if (location) {
        // 🏢 Zoom in close enough to see buildings (~18)
        map.flyTo(location, 18, { animate: true, duration: 2 });

        // 🧭 Optional: Add a temporary popup showing “You are here”
        const popup = L.popup().setLatLng(location).setContent("<b>You are here!</b>").openOn(map);

        // Auto close popup after few seconds
        setTimeout(() => map.closePopup(popup), 3000);
      }
    }, [location, map]);

    return null;
  };

  const RouteMapClickHandler = () => {
    useMapEvents({
      async click(e) {
        const { value: stopName } = await Swal.fire({
          title: "Add New Stop",
          input: "text",
          inputLabel: "Enter stop name",
          inputPlaceholder: `Stop ${routePoints.length + 1}`,
          showCancelButton: true,
          confirmButtonText: "Next",
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "#d33",
          background: "#fff",
          customClass: { popup: "rounded-2xl shadow-lg" },
        });

        if (!stopName) return;

        const { value: landmark } = await Swal.fire({
          title: "Add Landmark",
          input: "text",
          inputLabel: "Enter landmark (optional)",
          inputPlaceholder: "e.g., Near Park, Opp. School Gate",
          showCancelButton: true,
          confirmButtonText: "Next",
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "#d33",
          background: "#fff",
          customClass: { popup: "rounded-2xl shadow-lg" },
        });

        const { value: arrivalTime } = await Swal.fire({
          title: "Arrival Time (optional)",
          input: "datetime-local",
          showCancelButton: true,
          confirmButtonText: "Save Stop",
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "#d33",
          background: "#fff",
          customClass: { popup: "rounded-2xl shadow-lg" },
        });

        setRoutePoints((prev) => [
          ...prev,
          {
            name: stopName,
            landmark: landmark || "—",
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            order: prev.length + 1,
            arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : undefined,
          },
        ]);

        Swal.fire({
          icon: "success",
          title: "Stop Added!",
          text: `${stopName} (${landmark || "No landmark"}) added successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
      },
    });

    return null;
  };

  // ----------------- NEW: Assignment & View Helpers -----------------

  // Device view
  const handleViewDevice = async (deviceId: string, vehicle?: Vehicle) => {
    if (!deviceId) {
      Swal.fire("Info", "No device id provided", "info");
      return;
    }
    try {
      const res = await authFetch(`${API_BASE_URL}/operator/devices/${deviceId}/view`);
      const data = await res.json();
      if (!data.error && data.data) {
        const d = data.data;
        Swal.fire({
          title: `<strong>Device: ${d.device_id}</strong>`,
          html: `
            <div style="text-align:left">
              <div><b>IMEI:</b> ${d.imei || "—"}</div>
              <div><b>Type:</b> ${d.device_type || "—"}</div>
              <div><b>Status:</b> ${d.status ? "Active" : "Inactive"}</div>
              <div><b>SIM:</b> ${d.sim_number || "—"}</div>
              <div><b>Battery:</b> ${d.battery_level ?? "—"}</div>
              <div style="margin-top:8px;"><b>Assigned Vehicle:</b> ${d.assigned_vehicle?.vehicle_number || "—"}</div>
              <div style="margin-top:8px; font-size:12px; color:#666"><b>Created:</b> ${new Date(d.createdAt).toLocaleString()}</div>
            </div>
          `,
          showCloseButton: true,
          confirmButtonText: "Close",
          showCancelButton: false,
          customClass: { popup: "rounded-xl" },
        });
      } else {
        Swal.fire("Error", data.message || "Unable to fetch device", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to fetch device", "error");
    }
  };

  // Assign device to vehicle
  const handleAssignDevice = async (vehicle: Vehicle) => {
    const { value: device_id } = await Swal.fire({
      title: `Assign Device to ${vehicle.vehicle_number}`,
      input: "text",
      inputLabel: "Enter device_id (e.g. DEVAK-005)",
      inputPlaceholder: "device id",
      showCancelButton: true,
      confirmButtonText: "Assign",
      confirmButtonColor: "#2563eb",
      background: "#fff",
      customClass: { popup: "rounded-2xl" },
    });

    if (!device_id) return;

    try {
      const payload = { device_id, vehicle_id: vehicle.vehicle_id };
      const res = await authFetch(`${API_BASE_URL}/operator/assignments/device-to-vehicle`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.error) {
        Swal.fire("Success", data.message || "Device assigned", "success");
        fetchVehicles();
      } else {
        Swal.fire("Error", data.message || "Failed to assign device", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to assign device", "error");
    }
  };

  // Driver view
  const handleViewDriver = async (driverId: string, vehicle?: Vehicle) => {
    if (!driverId) {
      Swal.fire("Info", "No driver id provided", "info");
      return;
    }
    try {
      const res = await authFetch(`${API_BASE_URL}/operator/drivers/${driverId}/view`);
      const data = await res.json();
      if (!data.error && data.data) {
        const d = data.data;
        Swal.fire({
          title: `<strong>Driver: ${d.name || d._id}</strong>`,
          html: `
            <div style="text-align:left">
              <div><b>Email:</b> ${d.email || "—"}</div>
              <div><b>Phone:</b> ${d.phone_number || "—"}</div>
              <div><b>License:</b> ${d.license_number || "—"}</div>
              <div style="margin-top:8px; font-size:12px; color:#666"><b>Created:</b> ${new Date(d.createdAt).toLocaleString()}</div>
            </div>
          `,
          showCloseButton: true,
          confirmButtonText: "Close",
          customClass: { popup: "rounded-xl" },
        });
      } else {
        Swal.fire("Error", data.message || "Unable to fetch driver", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to fetch driver", "error");
    }
  };

  // Assign driver
  const handleAssignDriver = async (vehicle: Vehicle) => {
    const { value: driver_id } = await Swal.fire({
      title: `Assign Driver to ${vehicle.vehicle_number}`,
      input: "text",
      inputLabel: "Enter driver_id",
      inputPlaceholder: "driver id",
      showCancelButton: true,
      confirmButtonText: "Assign",
      confirmButtonColor: "#2563eb",
      background: "#fff",
      customClass: { popup: "rounded-2xl" },
    });

    if (!driver_id) return;

    try {
      const payload = { driver_id, vehicle_id: vehicle.vehicle_id };
      const res = await authFetch(`${API_BASE_URL}/operator/assignments/driver-to-vehicle`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.error) {
        Swal.fire("Success", data.message || "Driver assigned", "success");
        fetchVehicles();
      } else {
        Swal.fire("Error", data.message || "Failed to assign driver", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to assign driver", "error");
    }
  };

  // Passenger view (assumes this endpoint exists; change if needed)
  const handleViewPassenger = async (passengerId: string, vehicle?: Vehicle) => {
    if (!passengerId) {
      Swal.fire("Info", "No passenger id provided", "info");
      return;
    }
    try {
      const res = await authFetch(`${API_BASE_URL}/operator/end-users/${passengerId}/view`);
      const data = await res.json();
      if (!data.error && data.data) {
        const p = data.data;
        const html = `
          <div style="text-align:left">
            <div><b>Name:</b> ${p.name || "—"}</div>
            <div><b>Email:</b> ${p.email || "—"}</div>
            <div><b>Phone:</b> ${p.phone_number || "—"}</div>
            <div style="margin-top:8px"><b>Assigned Vehicle:</b> ${vehicle?.vehicle_number || p.assigned_vehicle?.vehicle_number || "—"}</div>
          </div>
        `;

        Swal.fire({
          title: `<strong>Passenger: ${p.name || p._id}</strong>`,
          html,
          showCloseButton: true,
          showCancelButton: !!vehicle,
          cancelButtonText: "Unassign",
          confirmButtonText: "Close",
          customClass: { popup: "rounded-xl" },
        }).then(async (resSwal) => {
          if (resSwal.dismiss === Swal.DismissReason.cancel && vehicle) {
            // Unassign flow
            const confirm = await Swal.fire({
              title: "Confirm Unassign",
              text: `Unassign ${p.name || passengerId} from ${vehicle.vehicle_number}?`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Unassign",
              confirmButtonColor: "#d33",
            });
            if (confirm.isConfirmed) {
              try {
                const payload = { end_user_id: passengerId, vehicle_id: vehicle.vehicle_id };
                const res = await authFetch(`${API_BASE_URL}/operator/assignments/unassign-end-user-from-vehicle`, {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
                const d = await res.json();
                if (!d.error) {
                  Swal.fire("Success", d.message || "Unassigned", "success");
                  fetchVehicles();
                } else {
                  Swal.fire("Error", d.message || "Failed to unassign", "error");
                }
              } catch (err) {
                console.error(err);
                Swal.fire("Error", "Unable to unassign passenger", "error");
              }
            }
          }
        });
      } else {
        Swal.fire("Error", data.message || "Unable to fetch passenger", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to fetch passenger", "error");
    }
  };

  // Assign passengers (single or multiple)
  const handleAssignPassengers = async (vehicle: Vehicle) => {
    const { value: raw } = await Swal.fire({
      title: `Assign Passenger(s) to ${vehicle.vehicle_number}`,
      input: "text",
      inputLabel: "Enter passenger id(s) (comma separated if multiple)",
      inputPlaceholder: "passenger1,passenger2 or single id",
      showCancelButton: true,
      confirmButtonText: "Assign",
      confirmButtonColor: "#2563eb",
      background: "#fff",
      customClass: { popup: "rounded-2xl" },
    });

    if (!raw) return;

    const ids = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      // We'll post each (if your API accepts batch, swap for a single call)
      for (const id of ids) {
        const payload = { end_user_id: id, vehicle_id: vehicle.vehicle_id };
        const res = await authFetch(`${API_BASE_URL}/operator/assignments/end-user-to-vehicle`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.error) {
          // Show error and stop
          Swal.fire("Error", d.message || `Failed to assign ${id}`, "error");
          return;
        }
      }
      Swal.fire("Success", "Passenger(s) assigned", "success");
      fetchVehicles();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to assign passenger(s)", "error");
    }
  };

  // ----------------- END NEW HELPERS -----------------

  // ---------- Render ----------
  return (
    <>
      <PageMeta title="Vehicles Management" description="Manage operator vehicles" />
      <PageBreadCrumb pageTitle="Vehicles" />
      <div className="bg-white dark:bg-gray-900 shadow border border-gray-200 dark:border-gray-800 p-6 rounded-lg max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Manage Vehicles</h2>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add Vehicle
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4">
              <input
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                placeholder="vehicle number"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />

              <select
                name="vehicle_type"
                value={form.vehicle_type || ""}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="" disabled hidden>
                  select vehicle type
                </option>
                <option value="bus">Bus</option>
                <option value="van">Van</option>
                <option value="car">Car</option>
              </select>

              <input
                name="route_name"
                value={form.route_name}
                onChange={handleChange}
                placeholder="route name"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

              <input
                name="capacity"
                type="number"
                value={form.capacity === 0 ? "" : form.capacity}
                onChange={handleChange}
                placeholder="capasity"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

              <input
                name="registration_number"
                value={form.registration_number}
                onChange={handleChange}
                placeholder="registration number"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

              <input
                name="chassis_number"
                value={form.chassis_number}
                onChange={handleChange}
                placeholder="chassis number"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                placeholder="color"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

              <input
                name="seating_capacity"
                type="number"
                value={form.seating_capacity === 0 ? "" : form.seating_capacity}
                onChange={handleChange}
                placeholder="seating capasity"
                className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 🗺️ Map Section with Stops */}
            <div className="relative h-[400px] border rounded-lg overflow-hidden mb-4">
              {/* 📍 Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                className="absolute z-[999] top-3 right-3 bg-white shadow-lg p-2 rounded-full hover:bg-gray-100 transition"
                title="Show My Location"
              >
                <LocateFixed className="text-blue-600" />
              </button>

              <MapContainer center={currentLocation || [12.9716, 77.5946]} zoom={7} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Smooth Fly Animation */}
                <FlyToLocation location={currentLocation} />

                {/* 🟢 Allow clicking to add stops */}
                <RouteMapClickHandler />

                {/* 🚌 Route Stops */}
                {routePoints.map((p) => (
                  <Marker key={p.order} position={[p.latitude, p.longitude]} icon={stopIcon}>
                    <Popup>
                      <strong>{p.name}</strong>
                      <br />
                      Order: {p.order}
                    </Popup>
                  </Marker>
                ))}

                {/* 📍 Standing Location Marker */}
                {currentLocation && (
                  <Marker position={currentLocation} icon={standingIcon}>
                    <Popup>
                      <strong>Standing Location</strong>
                      <br />
                      Lat: {(currentLocation as [number, number])[0].toFixed(4)}
                      <br />
                      Lng: {(currentLocation as [number, number])[1].toFixed(4)}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            <p className="text-sm text-gray-500 italic text-center mb-4">🗺️ Click on the map where you want to add the stop.</p>

            {/* 🟦 Added Stops List UI */}
            {routePoints.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Added Stops ({routePoints.length})</h3>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {routePoints.map((stop, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center bg-white dark:bg-gray-900 p-2 rounded shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">
                          {stop.order}. {stop.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Lat: {stop.latitude.toFixed(4)}, Lng: {stop.longitude.toFixed(4)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-red-500 text-xs hover:underline"
                        onClick={() =>
                          setRoutePoints((prev) =>
                            prev.filter((_, i) => i !== index).map((s, i2) => ({ ...s, order: i2 + 1 }))
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingVehicle ? "Update" : "Create"}</Button>
            </div>
          </form>
        )}

        {/* ---------- VEHICLE TABLE ---------- */}
        {/* wrapper ensures only table scrolls horizontally */}
        <div className="overflow-x-auto w-full">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {[
                  "Vehicle No",
                  "Type",
                  "Route",
                  "Color",
                  "Seating",
                  "Assigned Device", // NEW
                  "Assigned Driver", // NEW
                  "Assigned Passengers", // NEW
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-4">
                    No vehicles found
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  // defensive assignment detection
                  const deviceId =
                    // prefer assigned_device_id, fallback to assigned_device.device_id or assigned_device._id
                    (v as any).assigned_device_id || (v as any).assigned_device?.device_id || (v as any).assigned_device?._id || null;
                  const driverId = (v as any).assigned_driver_id || (v as any).assigned_driver?._id || null;
                  const passengers: Array<{ _id?: string; name?: string }> = (v as any).assigned_passengers || [];

                  return (
                    <tr key={v._id} className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-2">{v.vehicle_number}</td>
                      <td className="px-3 py-2">{v.vehicle_type}</td>
                      <td className="px-3 py-2">{v.route_name}</td>
                      <td className="px-3 py-2">{v.color}</td>
                      <td className="px-3 py-2">{v.seating_capacity ?? "—"}</td>

                      {/* Assigned Device */}
                      <td className="px-3 py-2">
                        {deviceId ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDevice(deviceId, v)}
                              className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                            >
                              View
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignDevice(v)}
                              className="text-xs px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Assigned Driver */}
                      <td className="px-3 py-2">
                        {driverId ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDriver(driverId, v)}
                              className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                            >
                              View
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignDriver(v)}
                              className="text-xs px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Assigned Passengers */}
                      <td className="px-3 py-2">
                        <div className="flex gap-2 items-center">
                          {/* view first passenger if exists */}
                          {passengers && passengers.length > 0 ? (
                            <>
                              <button
                                onClick={() => handleViewPassenger(passengers[0]._id || "", v)}
                                className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                              >
                                View
                              </button>
                              <span className="text-xs text-gray-500">+{Math.max(0, passengers.length - 1)}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 mr-2">—</span>
                          )}

                          <button
                            onClick={() => handleAssignPassengers(v)}
                            className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Assign
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${v.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {v.status ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleView(v)} className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100">
                            View
                          </button>
                          <button onClick={() => handleEdit(v)} className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(v)}
                            className={`text-xs px-3 py-1 rounded ${v.status ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
                          >
                            {v.status ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
