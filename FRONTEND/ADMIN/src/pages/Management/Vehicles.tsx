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
  landmark?: string;
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
  landmark?: string;
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

interface Driver {
  _id: string;
  name: string;
  email?: string;
  phone_number?: string;
  license_number?: string;
  status?: boolean;
  assigned_vehicle_id?: string | null;
  user_id?: string;
  driver_profile?: {
    driver_id: string;
  };
}

interface EndUser {
  _id: string;
  name: string;
  email?: string;
  phone_number?: string;
  assigned_vehicle_id?: string | null;
  end_user_profile?: {
    end_user_id: string;
    gender?: string;
    age?: number;
    address?: string;
    assigned_vehicle_id?: string | null;
    pickup_location?: {
      latitude: number;
      longitude: number;
      address: string;
      name: string;
    };
    dropoff_location?: {
      latitude: number;
      longitude: number;
      address: string;
      name: string;
    };
  };
}

interface Device {
  _id: string;
  device_id: string;
  imei: string;
  device_type: string;
  status: boolean;
  assigned_operator_id?: string;
  assigned_vehicle_id?: string;
  assigned_date?: string;
  battery_level?: number;
  firmware_version?: string;
  sim_number?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  assigned_vehicle?: {
    _id: string;
    vehicle_number: string;
    vehicle_type: string;
    route_name?: string;
    assigned_driver_id?: string | null;
    capacity?: number;
    current_status?: string;
    vehicle_id: string;
  };
  assigned_driver?: null;
}



export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  // Add near the other useState declarations
const [drivers, setDrivers] = useState<Driver[]>([]);
const [endUsers, setEndUsers] = useState<EndUser[]>([]);
const [devices, setDevices] = useState<Device[]>([]);

  const [form, setForm] = useState({
    vehicle_number: "",
    vehicle_type: "bus",
    route_name: "",
    capacity: 0,
    registration_number: "",
    chassis_number: "",
    color: "",
    seating_capacity: 0,
      landmark: "",  
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


  useEffect(() => {
  fetchDrivers();
  fetchEndUsers();
  fetchDevices();
}, []);

const fetchDrivers = async () => {
  try {
    const response = await authFetch(`${API_BASE_URL}/operator/drivers/list`);
    const result = await response.json();
    if (!result.error) setDrivers(result.data || []);
  } catch (error) {
    console.error("Error fetching drivers:", error);
  }
};

const fetchEndUsers = async () => {
  try {
    const response = await authFetch(`${API_BASE_URL}/operator/end-users/list`);
    const result = await response.json();
    if (!result.error) setEndUsers(result.data || []);
  } catch (error) {
    console.error("Error fetching end users:", error);
  }
};

const fetchDevices = async () => {
  try {
    const response = await authFetch(`${API_BASE_URL}/operator/devices/list`);
    const result = await response.json();
    if (!result.error) setDevices(result.data || []);
  } catch (error) {
    console.error("Error fetching devices:", error);
  }
};


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
          landmark: "",
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
  landmark: "",
});

  setRoutePoints([]);
  setStandingLocation(null);
  setEditingVehicle(null);
};

const handleEdit = (v: Vehicle) => {
  setEditingVehicle(v);
 setForm({
  vehicle_number: v.vehicle_number ?? "",
  vehicle_type: v.vehicle_type ?? "bus",
  route_name: v.route_name ?? "",
  capacity: v.capacity ?? 0,
  registration_number: v.registration_number ?? "",
  chassis_number: v.chassis_number ?? "",
  color: v.color ?? "",
  seating_capacity: v.seating_capacity ?? 0,
  landmark: v.landmark ?? "",
});

  setRoutePoints(v.route_points ?? []);
  setStandingLocation(v.standing_location ?? null);
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

      // 🔹 Route points
      const routeList =
        d.route_points?.length > 0
          ? d.route_points
              .map(
                (p: RoutePoint, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${p.name}</td>
                    <td class="text-gray-500 text-xs">(${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)})</td>
                  </tr>`
              )
              .join("")
          : `<tr><td colspan="3" class="text-gray-500 text-sm text-center">No route points available</td></tr>`;

      // 🔹 End users
      const endUsers =
        d.end_users?.length > 0
          ? d.end_users
              .map(
                (u: any, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${u.name || `Passenger ${i + 1}`}</td>
                    <td class="text-gray-500 text-xs">${u.pickup_location?.name || "—"} → ${u.dropoff_location?.name || "—"}</td>
                  </tr>`
              )
              .join("")
          : `<tr><td colspan="3" class="text-gray-500 text-sm text-center">No passengers assigned</td></tr>`;

      // 🔹 Standing location
      const stand = d.standing_location
        ? `${d.standing_location.name}<br/><span class='text-gray-500 text-xs'>(Lat: ${d.standing_location.latitude.toFixed(
            4
          )}, Lng: ${d.standing_location.longitude.toFixed(4)})</span>`
        : "—";

      // 🔹 Driver details
      const driver = d.driver
        ? `
        <div>
          <div><b>Name:</b> ${d.driver.name || "—"}</div>
          <div><b>Phone:</b> ${d.driver.phone_number || "—"}</div>
          <div><b>License:</b> ${d.driver.driver_profile?.license_number || "—"}</div>
          <div><b>Expiry:</b> ${
            d.driver.driver_profile?.license_expiry
              ? new Date(d.driver.driver_profile.license_expiry).toLocaleDateString()
              : "—"
          }</div>
        </div>`
        : "<div class='text-gray-500 text-sm'>No driver assigned</div>";

      // 🔹 Status badge
      const statusBadge = d.status
        ? `<span style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:600;">Active</span>`
        : `<span style="background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:600;">Inactive</span>`;

      // 🔹 SweetAlert popup (smaller layout)
      Swal.fire({
        title: `<strong class="text-base text-gray-800">Vehicle Details</strong>`,
        width: 520, // ⬅️ Reduced width
        background: "#fff",
        html: `
          <div style="text-align:left; font-size:13px; line-height:1.5; color:#333;">

            <!-- Vehicle info -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
              <div><b>Vehicle No:</b> ${d.vehicle_number}</div>
              <div><b>Status:</b> ${statusBadge}</div>
              <div><b>Type:</b> ${d.vehicle_type}</div>
              <div><b>Color:</b> ${d.color || "—"}</div>
              <div><b>Capacity:</b> ${d.capacity || "—"}</div>
              <div><b>Seating:</b> ${d.seating_capacity || "—"}</div>
              <div><b>Route:</b> ${d.route_name || "—"}</div>
              <div><b>Reg. No:</b> ${d.registration_number || "—"}</div>
              <div><b>Chassis:</b> ${d.chassis_number || "—"}</div>
              <div><b>Speed:</b> ${d.speed?.toFixed(2) || 0} km/h</div>
            </div>

            <hr class="my-2 border-gray-200"/>

            <!-- Driver + Standing Location side-by-side -->
            <div class="grid grid-cols-2 gap-x-4 mb-2">
              <div>
                <b>Driver Details:</b><br/>
                ${driver}
              </div>
              <div>
                <b>Standing Location:</b><br/>
                ${stand}
              </div>
            </div>

            <hr class="my-2 border-gray-200"/>

            <!-- Route points -->
            <b>Route Points:</b>
            <table style="width:100%; border-collapse:collapse; margin-top:4px; font-size:12px;">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <th align="left">#</th>
                  <th align="left">Name</th>
                  <th align="left">Coordinates</th>
                </tr>
              </thead>
              <tbody>${routeList}</tbody>
            </table>

            <hr class="my-2 border-gray-200"/>

            <!-- Passengers -->
            <b>Passengers:</b>
            <table style="width:100%; border-collapse:collapse; margin-top:4px; font-size:12px;">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <th align="left">#</th>
                  <th align="left">Name</th>
                  <th align="left">Pickup → Dropoff</th>
                </tr>
              </thead>
              <tbody>${endUsers}</tbody>
            </table>
          </div>
        `,
        confirmButtonText: "Close",
        confirmButtonColor: "#2563eb",
        showCloseButton: true,
        customClass: {
          popup: "rounded-xl shadow-md !p-3", // smaller padding
          title: "text-sm font-semibold",
        },
      });
    } else {
      Swal.fire("Error", data.message || "Failed to load details", "error");
    }
  } catch (err) {
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
          landmark: "",
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
      const vehicleInfo = d.assigned_vehicle || {};

      Swal.fire({
        title: `<strong style="font-size:16px;">Device: ${d.device_id || "—"}</strong>`,
        html: `
          <div style="text-align:left; font-size:13px; line-height:1.4; padding:4px;">
            <div><b>IMEI:</b> ${d.imei || "—"}</div>
            <div><b>Type:</b> ${d.device_type || "—"}</div>
            <div><b>Firmware:</b> ${d.firmware_version || "—"}</div>
            <div><b>SIM Number:</b> ${d.sim_number || "—"}</div>
            <div><b>Battery:</b> ${d.battery_level != null ? d.battery_level + "%" : "—"}</div>

            <hr style="margin:6px 0"/>

            <div><b>Assigned Vehicle:</b></div>
            <div style="margin-left:10px">
              <div><b>Number:</b> ${vehicleInfo.vehicle_number || "Not Assigned"}</div>
              <div><b>Type:</b> ${vehicleInfo.vehicle_type || "—"}</div>
              <div><b>Route:</b> ${vehicleInfo.route_name || "—"}</div>
              <div><b>Capacity:</b> ${vehicleInfo.capacity || "—"}</div>
              <div><b>Status:</b> ${vehicleInfo.current_status || "—"}</div>
            </div>

            <hr style="margin:6px 0"/>
             <p><b>Status:</b> ${
            d.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</p>
            <div><b>Assigned Date:</b> ${
              d.assigned_date ? new Date(d.assigned_date).toLocaleString() : "—"
            }</div>
          </div>
        `,
        showCloseButton: true,
        confirmButtonText: "Close",
        customClass: { popup: "rounded-xl" },
        width: 400, // smaller popup width
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
    const unassignedDevices = devices.filter(d => !d.assigned_vehicle_id);
    if (unassignedDevices.length === 0) {
      Swal.fire("Info", "No unassigned devices available", "info");
      return;
    }

    const inputOptions: Record<string, string> = {};
    unassignedDevices.forEach(d => {
      inputOptions[d.device_id] = `${d.device_id} (${d.imei})`;
    });

    const { value: device_id } = await Swal.fire({
      title: `Assign Device to ${vehicle.vehicle_number}`,
      input: "select",
      inputLabel: "Select Device",
      inputOptions,
      inputPlaceholder: "Select a device",
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
        fetchDevices(); // Refresh devices list
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
    let actualDriverId = driverId;
    if (driverId.startsWith("USR-")) {
      const driver = drivers.find((d) => d.user_id === driverId);
      if (driver) {
        actualDriverId = driver.driver_profile?.driver_id || driverId;
      }
    }

    const res = await authFetch(`${API_BASE_URL}/operator/drivers/${actualDriverId}/view`);
    const data = await res.json();

    if (!data.error && data.data) {
      const d = data.data;
      const profile = d.driver_profile || {};
      const vehicleInfo = d.assigned_vehicle || {};

      Swal.fire({
        title: `<strong style="font-size:16px;">Driver: ${d.name || profile.name || "—"}</strong>`,
        html: `
          <div style="text-align:left; font-size:13px; line-height:1.4; padding:4px;">
            <div><b>Email:</b> ${d.email || profile.email || "—"}</div>
            <div><b>Phone:</b> ${d.phone_number || profile.phone_number || "—"}</div>

            <hr style="margin:6px 0"/>

            <div><b>License No:</b> ${d.license_number || profile.license_number || "—"}</div>
            <div><b>Expiry:</b> ${
              d.license_expiry
                ? new Date(d.license_expiry).toLocaleDateString()
                : profile.license_expiry
                ? new Date(profile.license_expiry).toLocaleDateString()
                : "—"
            }</div>

            <hr style="margin:6px 0"/>

            <div><b>Vehicle Info:</b></div>
            <div style="margin-left:10px">
              <div><b>No:</b> ${vehicleInfo.vehicle_number || "Not Assigned"}</div>
              <div><b>Type:</b> ${vehicleInfo.vehicle_type || "—"}</div>
              <div><b>Route:</b> ${vehicleInfo.route_name || "—"}</div>
              <div><b>Capacity:</b> ${vehicleInfo.capacity || "—"}</div>
            </div>

            <hr style="margin:6px 0"/>
              <p><b>Status:</b> ${
            d.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</p>
          </div>
        `,
        showCloseButton: true,
        confirmButtonText: "Close",
        customClass: { popup: "rounded-xl" },
        width: 400, // smaller box
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
    const unassignedDrivers = drivers.filter(d => !d.assigned_vehicle_id);
    if (unassignedDrivers.length === 0) {
      Swal.fire("Info", "No unassigned drivers available", "info");
      return;
    }

    const inputOptions: Record<string, string> = {};
    unassignedDrivers.forEach(d => {
      inputOptions[d.driver_profile?.driver_id || d._id] = d.name;
    });

    const { value: driver_id } = await Swal.fire({
      title: `Assign Driver to ${vehicle.vehicle_number}`,
      input: "select",
      inputLabel: "Select Driver",
      inputOptions,
      inputPlaceholder: "Select a driver",
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
        fetchDrivers(); // Refresh drivers list
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
      const profile = p.end_user_profile || {};
      const sos = profile.sos_contact || {};
      const pickup = profile.pickup_location || {};
      const dropoff = profile.dropoff_location || {};
      const vehicleInfo = p.assigned_vehicle || vehicle;

      const darkMode = document.documentElement.classList.contains("dark");

      const html = `
        <div style="text-align:left; font-size:14px; line-height:1.6;">
          <p><b>Name:</b> ${p.name || "—"}</p>
          <p><b>Email:</b> ${p.email || "—"}</p>
          <p><b>Phone:</b> ${p.phone_number || "—"}</p>

          <hr style="margin:10px 0;border:none;border-top:1px solid ${
            darkMode ? "#374151" : "#e5e7eb"
          };"/>

          <p><b>SOS Contact:</b> ${sos.name || "—"} (${sos.phone_number || "—"})</p>
          <p><b>Pickup:</b> ${pickup.name || "—"} (${pickup.address || "—"})</p>
          <p><b>Dropoff:</b> ${dropoff.name || "—"} (${dropoff.address || "—"})</p>

          <hr style="margin:10px 0;border:none;border-top:1px solid ${
            darkMode ? "#374151" : "#e5e7eb"
          };"/>

          <p><b>Assigned Vehicle:</b> ${vehicleInfo?.vehicle_number || "—"}</p>
          <p><b>Assigned Driver:</b> ${vehicleInfo?.driver?.name || "—"}</p>
           <p><b>Status:</b> ${
            p.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</p>
        </div>
      `;

      Swal.fire({
        background: darkMode ? "#1f2937" : "#ffffff",
        color: darkMode ? "#e5e7eb" : "#111827",
        title: `<h3 style="font-size:16px; font-weight:600; margin-bottom:8px;">Passenger Details</h3>`,
        html,
        showCloseButton: true,
        showCancelButton: !!vehicle,
        cancelButtonText: "Unassign",
        confirmButtonText: "Close",
        confirmButtonColor: darkMode ? "#6366f1" : "#4f46e5",
        customClass: { popup: "rounded-xl shadow-lg" },
        width: 420,
      }).then(async (resSwal) => {
        if (resSwal.dismiss === Swal.DismissReason.cancel && vehicle) {
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
              const payload = {
                end_user_id: passengerId,
                vehicle_id: vehicle.vehicle_id,
              };
              const res = await authFetch(
                `${API_BASE_URL}/operator/assignments/unassign-end-user-from-vehicle`,
                {
                  method: "POST",
                  body: JSON.stringify(payload),
                }
              );
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
    const { value: selectedPassengers } = await Swal.fire({
      title: `Assign Passengers to ${vehicle.vehicle_number}`,
      html: `
        <div id="passengers-container">
          <select id="passenger-0" class="swal2-select">
            <option value="">Select Passenger</option>
            ${endUsers.filter(u => !u.assigned_vehicle_id && !u.end_user_profile?.assigned_vehicle_id).map(u => `<option value="${u.end_user_profile?.end_user_id}">${u.name}</option>`).join('')}
          </select>
        </div>
        <button id="add-passenger" type="button" class="swal2-styled" style="margin-top: 10px;">Add Another</button>
      `,
      showCancelButton: true,
      confirmButtonText: 'Assign',
      didOpen: () => {
        let count = 1;
        document.getElementById('add-passenger')?.addEventListener('click', (e) => {
          e.preventDefault();
          const container = document.getElementById('passengers-container');
          if (container) {
            const select = document.createElement('select');
            select.id = `passenger-${count}`;
            select.className = 'swal2-select';
            select.innerHTML = `<option value="">Select Passenger</option>${endUsers.filter(u => !u.assigned_vehicle_id && !u.end_user_profile?.assigned_vehicle_id).map(u => `<option value="${u.end_user_profile?.end_user_id}">${u.name}</option>`).join('')}`;
            container.appendChild(select);
            container.appendChild(document.createElement('br'));
            count++;
          }
        });
      },
      preConfirm: () => {
        const selects = document.querySelectorAll('#passengers-container select');
        const selected = Array.from(selects).map(s => (s as HTMLSelectElement).value).filter(v => v);
        return [...new Set(selected)]; // unique
      }
    });

    if (!selectedPassengers || selectedPassengers.length === 0) return;

    try {
      for (const end_user_id of selectedPassengers) {
        const payload = { end_user_id, vehicle_id: vehicle.vehicle_id };
        const res = await authFetch(`${API_BASE_URL}/operator/assignments/end-user-to-vehicle`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.message || "Failed to assign passenger");
        }
      }
      Swal.fire("Success", "Passengers assigned successfully", "success");
      fetchVehicles();
      fetchEndUsers(); // refresh
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unable to assign passengers";
      Swal.fire("Error", message, "error");
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
             <input
  name="landmark"
  value={form.landmark}
  onChange={handleChange}
  placeholder="Landmark"
  className="border border-gray-300 p-2 rounded text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
/>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingVehicle ? "Update" : "Create"}</Button>
            </div>
          </form>
        )}

        {/* ---------- VEHICLE TABLE ---------- */}
      <div className="overflow-x-auto no-scrollbar">
           <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {[
                  "Vehicle No",
                  "Type",
                  "Route",
                  "Color",
                  "Seating",
                  "Assigned Device",
                  "Assigned Driver",
                  "Assigned Passengers",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
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
                  const assignedPassengers = endUsers.filter(u => u.assigned_vehicle_id === v.vehicle_id || u.end_user_profile?.assigned_vehicle_id === v.vehicle_id);

                  return (
                    <tr key={v._id} className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-2 whitespace-nowrap">{v.vehicle_number}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{v.vehicle_type}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{v.route_name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{v.color}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{v.seating_capacity ?? "—"}</td>

                      {/* Assigned Device */}
                      <td className="px-3 py-2 whitespace-nowrap">
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
                      <td className="px-3 py-2 whitespace-nowrap">
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
                   <td className="px-3 py-2 whitespace-nowrap">
  <div
    className={`flex gap-4 ${
      assignedPassengers.length === 0 ? "justify-center" : "justify-start"
    }`}
  >
    {/* Left column — View buttons */}
    {assignedPassengers.length > 0 && (
      <div className="flex flex-col gap-1">
        {assignedPassengers.map((p) => (
          <button
            key={p._id}
            onClick={() =>
              handleViewPassenger(p.end_user_profile?.end_user_id!, v)
            }
            className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
          >
            View
          </button>
        ))}
      </div>
    )}

    {/* Right column — Assign button */}
    <div className="flex flex-col justify-center">
      <button
        onClick={() => handleAssignPassengers(v)}
        className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
      >
        Assign
      </button>
    </div>
  </div>
</td>


                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${v.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {v.status ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">
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
