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
import PageShimmer from "../../components/common/PageShimmer";

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
      phone_number?: string;  
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
// Pagination states
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

const [driverPage, setDriverPage] = useState(1);
const [userPage, setUserPage] = useState(1);
const [devicePage, setDevicePage] = useState(1);

const [limit] = useState(10);

// To check if more data exists
const [hasMoreDrivers, setHasMoreDrivers] = useState(true);
const [hasMoreUsers, setHasMoreUsers] = useState(true);
const [hasMoreDevices, setHasMoreDevices] = useState(true);
const [formStep, setFormStep] = useState(1); 

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
  

const fetchVehicles = async (reset = false) => {
  try {
    if (reset) {
      setPage(1);
      setVehicles([]); 
      setHasMore(true);
    }

    const pageToFetch = reset ? 1 : page;

    const res = await authFetch(`${API_BASE_URL}/operator/vehicles/list?page=${pageToFetch}&limit=${limit}`);
    const result = await res.json();

    if (result.error) throw new Error(result.message);

    const newData = result.data || [];

setVehicles(prev => {
  const merged = [...prev, ...newData];
  return Array.from(new Map(merged.map(v => [v.vehicle_id, v])).values());
});
    setPage(pageToFetch + 1);

    setHasMore(newData.length === limit);
  } catch (err: any) {
    Swal.fire("Error", err.message || "Failed to fetch vehicles", "error");
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
};



useEffect(() => {
  fetchVehicles(true);
  fetchDrivers(true);
  fetchEndUsers(true);
  fetchDevices(true);
}, []);

const fetchDrivers = async (reset = false) => {
  try {
    if (reset) {
      setDriverPage(1);
      setDrivers([]); // clear old data
      setHasMoreDrivers(true);
    }

    const pageToFetch = reset ? 1 : driverPage;

    const response = await authFetch(`${API_BASE_URL}/operator/drivers/list?page=${pageToFetch}&limit=${limit}`);
    const result = await response.json();

    if (!result.error) {
      const data = result.data || [];

      setDrivers((prev) => [...prev, ...data]);
      setDriverPage(pageToFetch + 1);

      setHasMoreDrivers(data.length === limit);
    }
  } catch (error) {
    console.error("Error fetching drivers:", error);
  }
};



const fetchEndUsers = async (reset = false) => {
  try {
    if (reset) {
      setUserPage(1);
      setEndUsers([]);
      setHasMoreUsers(true);
    }

    const pageToFetch = reset ? 1 : userPage;

    const response = await authFetch(`${API_BASE_URL}/operator/end-users/list?page=${pageToFetch}&limit=${limit}`);
    const result = await response.json();

    if (!result.error) {
      const data = result.data || [];

      setEndUsers((prev) => [...prev, ...data]);
      setUserPage(pageToFetch + 1);
      setHasMoreUsers(data.length === limit);
    }
  } catch (error) {
    console.error("Error fetching end users:", error);
  }
};



const fetchDevices = async (reset = false) => {
  try {
    if (reset) {
      setDevicePage(1);
      setDevices([]);
      setHasMoreDevices(true);
    }

    const pageToFetch = reset ? 1 : devicePage;

    const response = await authFetch(`${API_BASE_URL}/operator/devices/list?page=${pageToFetch}&limit=${limit}`);
    const result = await response.json();

    if (!result.error) {
      const data = result.data || [];

      setDevices((prev) => [...prev, ...data]);
      setDevicePage(pageToFetch + 1);
      setHasMoreDevices(data.length === limit);
    }
  } catch (error) {
    console.error("Error fetching devices:", error);
  }
};




  // ---------- Map Handlers ----------
  const defaultCenter: LatLngExpression = [28.6139, 77.209]; // New Delhi
function StandingMapHandler() {
  useMapEvents({
    async click(e) {
      const darkMode = document.documentElement.classList.contains("dark");

      const { value: locationName } = await Swal.fire({
        title: "Standing Location",
        input: "text",
        inputPlaceholder: "Enter location name (e.g. Depot A)",
        confirmButtonText: "Set Location",
        showCancelButton: true,
        background: darkMode ? "#020617" : "#ffffff",
        color: darkMode ? "#e5e7eb" : "#111827",
        confirmButtonColor: "#4f46e5",
        customClass: {
          popup: "rounded-xl shadow-lg",
        },
        inputValidator: (value) => {
          if (!value) return "Location name is required";
          return null;
        },
      });

      if (!locationName) return;

      setStandingLocation({
        name: locationName,
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
  e.stopPropagation();

  if (formStep !== 3) {
    console.warn("Submit blocked — not on step 3");
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

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.error) {
      showSuccess(
        editingVehicle
          ? "Vehicle updated successfully"
          : "Vehicle created successfully"
      );

      resetForm();
      setFormStep(1);
      setShowForm(false);
      fetchVehicles(true);
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
  const darkMode = document.documentElement.classList.contains("dark");

  setEditingVehicle(v);

  // Pre-fill form with vehicle details
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

  // Pre-fill route points and standing location
  setRoutePoints(v.route_points ?? []);
  setStandingLocation(v.standing_location ?? null);

  setShowForm(true);

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Theme-aware styling
  const formContainer = document.getElementById("vehicle-form-container");
  if (formContainer) {
    formContainer.style.backgroundColor = darkMode ? "#1f2937" : "#ffffff";
    formContainer.style.color = darkMode ? "#e5e7eb" : "#111827";

    // Apply theme-aware color and styling to all inputs, selects, textareas
    const inputs = formContainer.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).style.backgroundColor = darkMode ? "#374151" : "#f9fafb";
      (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).style.color = darkMode ? "#e5e7eb" : "#111827"; // <-- your requested text color
      (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).style.border = darkMode ? "1px solid #4b5563" : "1px solid #d1d5db";
    });
  }
};



  const handleToggleStatus = async (v: Vehicle) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/operator/vehicles/${v.vehicle_id}/deactivate`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!data.error) {
        // Swal.fire("Success", data.message || "Status updated", "success");
        showSuccess("Status updated");
        fetchVehicles(true);
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
      const darkMode = document.documentElement.classList.contains("dark");

      // 🔹 Route points
      const routeList =
        d.route_points?.length > 0
          ? d.route_points
              .map(
                (p: RoutePoint, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${p.name}</td>
                    <td style="color:${darkMode ? '#9ca3af' : '#6b7280'}; font-size:12px;">(${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)})</td>
                  </tr>`
              )
              .join("")
          : `<tr><td colspan="3" style="text-align:center; color:${darkMode ? '#9ca3af' : '#6b7280'}; font-size:12px;">No route points available</td></tr>`;

      // 🔹 End users
      const endUsers =
        d.end_users?.length > 0
          ? d.end_users
              .map(
                (u: any, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${u.name || `Passenger ${i + 1}`}</td>
                    <td style="color:${darkMode ? '#9ca3af' : '#6b7280'}; font-size:12px;">${u.pickup_location?.name || "—"} → ${u.dropoff_location?.name || "—"}</td>
                  </tr>`
              )
              .join("")
          : `<tr><td colspan="3" style="text-align:center; color:${darkMode ? '#9ca3af' : '#6b7280'}; font-size:12px;">No passengers assigned</td></tr>`;

      // 🔹 Standing location
      const stand = d.standing_location
        ? `${d.standing_location.name}<br/><span style="color:${darkMode ? '#9ca3af' : '#6b7280'}; font-size:12px;">(Lat: ${d.standing_location.latitude.toFixed(
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
        : `<div style="color:${darkMode ? '#9ca3af' : '#6b7280'}; font-size:12px;">No driver assigned</div>`;

      // 🔹 Status badge
      const statusBadge = d.status
        ? `<span style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:600;">Active</span>`
        : `<span style="background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:600;">Inactive</span>`;

      // 🔹 SweetAlert popup with dark/light theme
   Swal.fire({
  showCloseButton: false,
  showConfirmButton: false,
  width: 520,
  padding: "0",
  background: "transparent",
  html: `
  <div style="
    border-radius:22px;
    padding:2px;
    background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5);
    box-shadow:0 22px 60px rgba(0,0,0,.35);
  ">
    <div style="
      background:${darkMode ? "#020617" : "#ffffff"};
      border-radius:20px;
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
          radial-gradient(520px at top left, rgba(99,102,241,.14), transparent 40%),
          radial-gradient(420px at bottom right, rgba(34,211,238,.10), transparent 45%);
      "></div>

      <!-- HEADER -->
      <div style="
        position:relative;
        padding:16px 18px;
        background:linear-gradient(135deg,#4f46e5,#6366f1);
        display:flex;
        align-items:center;
        gap:12px;
      ">
        <div style="
          width:46px;height:46px;border-radius:14px;
          background:rgba(255,255,255,.22);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;font-weight:800;color:white;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
        ">
          ${d.vehicle_number.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style="font-size:17px;font-weight:700;color:white">
            ${d.vehicle_number}
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,.85)">
            Vehicle
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <div style="position:relative;padding:18px;font-size:13px;color:${darkMode ? "#e5e7eb" : "#111827"}">

        <!-- BASIC INFO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><b>Type:</b> ${d.vehicle_type}</div>
          <div><b>Status:</b> ${statusBadge}</div>
          <div><b>Color:</b> ${d.color || "—"}</div>
          <div><b>Capacity:</b> ${d.capacity || "—"}</div>
          <div><b>Seating:</b> ${d.seating_capacity || "—"}</div>
          <div><b>Reg. No:</b> ${d.registration_number || "—"}</div>
          <div><b>Chassis:</b> ${d.chassis_number || "—"}</div>
          <div><b>Speed:</b> ${d.speed?.toFixed(2) || 0} km/h</div>
        </div>

        <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};margin:14px 0"/>

        <!-- DRIVER + STANDING -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <b>Driver Details</b><br/>
            ${driver}
          </div>
          <div>
            <b>Standing Location</b><br/>
            ${stand}
          </div>
        </div>

        <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};margin:14px 0"/>

        <!-- PASSENGERS -->
        <b>Passengers</b>
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid ${darkMode ? "#374151" : "#e5e7eb"}">
              <th align="left">#</th>
              <th align="left">Name</th>
              <th align="left">Pickup → Dropoff</th>
            </tr>
          </thead>
          <tbody>
            ${endUsers}
          </tbody>
        </table>

      </div>

      <!-- ACTION -->
      <div style="
        display:flex;
        justify-content:flex-end;
        padding:14px 18px;
        border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};
      ">
        <button id="closeVehicleBtn" style="
          background:${darkMode ? "#374151" : "#e5e7eb"};
          color:${darkMode ? "#e5e7eb" : "#111827"};
          border:none;
          border-radius:8px;
          padding:6px 14px;
          font-size:13px;
          cursor:pointer;
        ">Close</button>
      </div>

    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" },
  didOpen: () => {
    document
      .getElementById("closeVehicleBtn")
      ?.addEventListener("click", () => Swal.close());
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
    showSuccess("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      Swal.close();
      const { latitude, longitude } = position.coords;
      setCurrentLocation([latitude, longitude]); // ✅ ONLY this
    },
    (error) => {
      Swal.close();
      showSuccess("Unable to retrieve your location");
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
        map.flyTo(location, 14, { animate: true, duration: 1.4 });

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
    // Swal.fire("Info", "No device id provided", "info");
    showSuccess("No device id provided");
    return;
  }

  try {
    const res = await authFetch(`${API_BASE_URL}/operator/devices/${deviceId}/view`);
    const data = await res.json();

    if (!data.error && data.data) {
      const d = data.data;
      const darkMode = document.documentElement.classList.contains("dark");
      const vehicleInfo = d.assigned_vehicle || {};

      const infoRow = (label: string, value: string | number | null | undefined) => `
        <div style="
          font-size:14px;
          font-weight:500;
          padding:4px 0;
          color:${darkMode ? "#e5e7eb" : "#111827"};
        ">
          <b>${label} :</b> ${value ?? "—"}
        </div>
      `;

    Swal.fire({
  showCloseButton: true,
  showConfirmButton: false,
  width: 600,
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
          ${d.device_id.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style="font-size:20px;font-weight:800;color:white">
            ${d.device_id}
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,.85)">
            Device Profile
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <div style="position:relative; padding:24px; color:${darkMode ? "#e5e7eb" : "#111827"};">

        <!-- DEVICE INFO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px">
          ${infoRow("IMEI", d.imei)}
          ${infoRow("Type", d.device_type)}
          ${infoRow("Firmware", d.firmware_version)}
          ${infoRow("SIM Number", d.sim_number)}
          ${infoRow(
            "Battery Level",
            d.battery_level != null ? d.battery_level + "%" : "—"
          )}
          <div>
            <b>Status:</b>
            ${
              d.status
                ? `<span style="margin-left:6px;background:#10b98122;color:#10b981;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600">Active</span>`
                : `<span style="margin-left:6px;background:#ef444422;color:#ef4444;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600">Inactive</span>`
            }
          </div>
          ${infoRow(
            "Assigned Date",
            d.assigned_date
              ? new Date(d.assigned_date).toLocaleString()
              : "—"
          )}
        </div>

        <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};margin:18px 0"/>

        <!-- ASSIGNED VEHICLE -->
        <b style="font-size:15px">Assigned Vehicle</b>

        <table style="
          width:100%;
          border-collapse:collapse;
          margin-top:12px;
          font-size:14px;
          border:1px solid ${darkMode ? "#4b5563" : "#ddd"};
        ">
          <thead>
            <tr style="background:${darkMode ? "#1f2937" : "#f3f4f6"}">
              <th style="padding:10px;text-align:left">Vehicle Number</th>
              <th style="padding:10px;text-align:left">Type</th>
              <th style="padding:10px;text-align:left">Capacity</th>
              <th style="padding:10px;text-align:left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 10px">${vehicleInfo.vehicle_number || "Not Assigned"}</td>
              <td style="padding:8px 10px">${vehicleInfo.vehicle_type || "—"}</td>
              <td style="padding:8px 10px">${vehicleInfo.capacity || "—"}</td>
              <td style="padding:8px 10px">${vehicleInfo.current_status || "—"}</td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" }
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
    showSuccess("No unassigned devices available");
    return;
  }

  const inputOptions: Record<string, string> = {};
  unassignedDevices.forEach(d => {
    inputOptions[d.device_id] = `${d.device_id} (${d.imei})`;
  });

  const darkMode = document.documentElement.classList.contains("dark");

const { value: device_id } = await Swal.fire({
  title: "",
  showCancelButton: true,
  confirmButtonText: "Assign Device",
  cancelButtonText: "Cancel",
  width: 460,
  background: darkMode ? "#020617" : "#ffffff",
  color: darkMode ? "#e5e7eb" : "#111827",
  customClass: { popup: "rounded-2xl shadow-xl" },

  html: `
   <div style="
    padding:22px 24px;
    text-align:left;
    font-family:Inter,system-ui,sans-serif;
  ">
      <h3 style="
        font-size:18px;
        font-weight:700;
        margin-bottom:6px;
        color:${darkMode ? "#e5e7eb" : "#111827"};
      ">
        Assign Device
      </h3>

      <p style="
        font-size:13px;
        color:${darkMode ? "#9ca3af" : "#6b7280"};
        margin-bottom:14px;
      ">
        Select an unassigned device for <b>${vehicle.vehicle_number}</b>
      </p>

     <select id="device-select" class="swal2-select" style="
  width:90%;
  height:52px;
  padding:0 16px;
  font-size:16px;
        border-radius:10px;
        border:1px solid ${darkMode ? "#374151" : "#d1d5db"};
        background:${darkMode ? "#020617" : "#ffffff"};
        color:${darkMode ? "#e5e7eb" : "#111827"};
      ">
        <option value="">Choose Device</option>
        ${Object.entries(inputOptions)
          .map(([id, label]) => `<option value="${id}">${label}</option>`)
          .join("")}
      </select>
    </div>
  `,
  preConfirm: () => {
    const val = (document.getElementById("device-select") as HTMLSelectElement)
      ?.value;
    if (!val) {
      Swal.showValidationMessage("Please select a device");
      return;
    }
    return val;
  },
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
      showSuccess(data.message || "Device assigned");
      fetchVehicles(true);
      fetchDevices(true); // Refresh devices list
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
    // Swal.fire("Info", "No driver id provided", "info");
    showSuccess("No driver id provided");
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
      const darkMode = document.documentElement.classList.contains("dark");

      const infoRow = (label: string, value: string | number | null | undefined) => `
        <div style="
          font-size:14px;
          font-weight:500;
          padding:4px 0;
          color:${darkMode ? "#e5e7eb" : "#111827"};
        ">
          <b>${label} :</b> ${value ?? "—"}
        </div>
      `;

     Swal.fire({
  showCloseButton: true,
  showConfirmButton: false,
  width: 600,
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
          ${(d.name || profile.name || "D").charAt(0).toUpperCase()}
        </div>

        <div>
          <div style="font-size:20px;font-weight:800;color:white">
            ${d.name || profile.name || "—"}
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,.85)">
            Driver Profile
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <div style="position:relative; padding:24px; color:${darkMode ? "#e5e7eb" : "#111827"};">

        <!-- BASIC INFO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px">
          ${infoRow("Email", d.email || profile.email)}
          ${infoRow("Phone", d.phone_number || profile.phone_number)}
          ${infoRow("License No", d.license_number || profile.license_number)}
          ${infoRow(
            "License Expiry",
            d.license_expiry
              ? new Date(d.license_expiry).toLocaleDateString()
              : profile.license_expiry
              ? new Date(profile.license_expiry).toLocaleDateString()
              : "—"
          )}
          <div>
            <b>Status:</b>
            ${
              d.status
                ? `<span style="margin-left:6px;background:#10b98122;color:#10b981;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600">Active</span>`
                : `<span style="margin-left:6px;background:#ef444422;color:#ef4444;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600">Inactive</span>`
            }
          </div>
        </div>

        <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};margin:18px 0"/>

        <!-- ASSIGNED VEHICLE -->
        <b style="font-size:15px">Assigned Vehicle</b>

        <table style="
          width:100%;
          border-collapse:collapse;
          margin-top:12px;
          font-size:14px;
          border:1px solid ${darkMode ? "#4b5563" : "#ddd"};
        ">
          <thead>
            <tr style="background:${darkMode ? "#1f2937" : "#f3f4f6"}">
              <th style="padding:10px;text-align:left">Vehicle Number</th>
              <th style="padding:10px;text-align:left">Type</th>
              <th style="padding:10px;text-align:left">Capacity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 10px">${vehicleInfo.vehicle_number || "Not Assigned"}</td>
              <td style="padding:8px 10px">${vehicleInfo.vehicle_type || "—"}</td>
              <td style="padding:8px 10px">${vehicleInfo.capacity || "—"}</td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" }
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
  Swal.fire({
    icon: "info",
    title: "No Available Drivers",
    text: "All drivers are already assigned to vehicles.",
    confirmButtonText: "OK",
    confirmButtonColor: "#4f46e5",
    background: document.documentElement.classList.contains("dark")
      ? "#1f2937"
      : "#ffffff",
    color: document.documentElement.classList.contains("dark")
      ? "#e5e7eb"
      : "#111827",
    customClass: {
      popup: "rounded-xl shadow-lg",
    },
  });
  return;
}


  const inputOptions: Record<string, string> = {};
  unassignedDrivers.forEach(d => {
    inputOptions[d.driver_profile?.driver_id || d._id] = d.name;
  });

  const darkMode = document.documentElement.classList.contains("dark");

const { value: driver_id } = await Swal.fire({
  title: "",
  showCancelButton: true,
  confirmButtonText: "Assign Driver",
  cancelButtonText: "Cancel",
  width: 460,
  background: darkMode ? "#020617" : "#ffffff",
  color: darkMode ? "#e5e7eb" : "#111827",
  customClass: { popup: "rounded-2xl shadow-xl" },

  html: `
     <div style="
    padding:22px 24px;
    text-align:left;
    font-family:Inter,system-ui,sans-serif;
  ">
      <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">
        Assign Driver
      </h3>

      <p style="font-size:13px;color:${darkMode ? "#9ca3af" : "#6b7280"};margin-bottom:14px">
        Choose a driver for <b>${vehicle.vehicle_number}</b>
      </p>

      <select id="driver-select" class="swal2-select" style="
        width:90%;
        height:52px;
padding:0 16px;
font-size:16px;
        border-radius:10px;
        border:1px solid ${darkMode ? "#374151" : "#d1d5db"};
        background:${darkMode ? "#020617" : "#ffffff"};
        color:${darkMode ? "#e5e7eb" : "#111827"};
      ">
        <option value="">Select Driver</option>
        ${Object.entries(inputOptions)
          .map(([id, name]) => `<option value="${id}">${name}</option>`)
          .join("")}
      </select>
    </div>
  `,
  preConfirm: () => {
    const val = (document.getElementById("driver-select") as HTMLSelectElement)
      ?.value;
    if (!val) {
      Swal.showValidationMessage("Please select a driver");
      return;
    }
    return val;
  },
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
      // Swal.fire("Success", data.message || "Driver assigned", "success");
      showSuccess(data.message || "Driver assigned");
      fetchVehicles(true);
      fetchDrivers(true); // Refresh drivers list
    } else {
      Swal.fire("Error", data.message || "Failed to assign driver", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Unable to assign driver", "error");
  }
};

const handleViewAllPassengers = async (vehicle: Vehicle, passengers: EndUser[]) => {
  const darkMode = document.documentElement.classList.contains("dark");

  if (!passengers.length) {
    showSuccess("No passengers assigned");
    return;
  }

const passengerRows = passengers
  .map(
    (p, i) => `
      <tr style="border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}">
        <td style="padding:10px;color:${darkMode ? "#e5e7eb" : "#111827"};">${i + 1}</td>

        <td style="padding:10px;font-weight:600;color:${darkMode ? "#e5e7eb" : "#111827"};">
          ${p.name}
        </td>

       <td style="padding:10px">
  <span style="
    font-size:12px;
    background:${darkMode ? "#1f2937" : "#ecfeff"};
    color:${darkMode ? "#67e8f9" : "#0e7490"};
    padding:4px 10px;
    border-radius:999px;
    display:inline-block;
    font-weight:600;
  ">
    ${p.phone_number || p.end_user_profile?.phone_number || "—"}
  </span>
</td>


        <td style="padding:10px;text-align:center">
          <button
            data-id="${p.end_user_profile?.end_user_id}"
            class="viewPassengerBtn"
            style="
              background:#4f46e5;
              color:white;
              border:none;
              border-radius:999px;
              padding:6px 16px;
              font-size:12px;
              cursor:pointer;
            "
          >
            View
          </button>
        </td>
      </tr>
    `
  )
  .join("");


  await Swal.fire({
    showConfirmButton: false,
    width: 620,
    background: darkMode ? "#020617" : "#ffffff",
  html: `
<div style="
  font-family:Inter,system-ui,sans-serif;
  background:${darkMode ? "#020617" : "#ffffff"};
  border-radius:16px;
  padding:20px;
">

  <!-- HEADER -->
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:14px;
  ">
    <h3 style="
      font-size:18px;
      font-weight:700;
      color:${darkMode ? "#e5e7eb" : "#111827"};
    ">
      Assigned Passengers – ${vehicle.vehicle_number}
    </h3>

    <button id="closeAllPassengers" style="
      background:${darkMode ? "#374151" : "#e5e7eb"};
      color:${darkMode ? "#e5e7eb" : "#111827"};
      border:none;
      border-radius:8px;
      padding:6px 12px;
      cursor:pointer;
      font-size:13px;
    ">
      Close
    </button>
  </div>

  <!-- TABLE -->
  <div style="
    border:1px solid ${darkMode ? "#374151" : "#e5e7eb"};
    border-radius:12px;
    overflow:hidden;
  ">
    <table style="
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    ">
      <thead style="background:${darkMode ? "#1f2937" : "#f9fafb"}">
        <tr>
          <th style="padding:10px;text-align:left;color:${darkMode ? "#e5e7eb" : "#111827"};">#</th>
          <th style="padding:10px;text-align:left;color:${darkMode ? "#e5e7eb" : "#111827"};">Name</th>
          <th style="padding:10px;text-align:left;color:${darkMode ? "#e5e7eb" : "#111827"};">Phone</th>
          <th style="padding:10px;text-align:center;color:${darkMode ? "#e5e7eb" : "#111827"};">Action</th>
        </tr>
      </thead>

      <tbody>
        ${passengerRows}
      </tbody>
    </table>
  </div>
</div>
`,

    didOpen: () => {
      document
        .getElementById("closeAllPassengers")
        ?.addEventListener("click", () => Swal.close());

      document.querySelectorAll(".viewPassengerBtn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = (btn as HTMLElement).getAttribute("data-id");
          if (id) {
            Swal.close();
            handleViewPassenger(id, vehicle);
          }
        });
      });
    },
  });
};


  // Passenger view (assumes this endpoint exists; change if needed)
const handleViewPassenger = async (passengerId: string, vehicle?: Vehicle) => {
  if (!passengerId) {
    showSuccess("No passenger id provided");
    return;
  }

  try {
    const res = await authFetch(
      `${API_BASE_URL}/operator/end-users/${passengerId}/view`
    );
    const data = await res.json();

    if (!data.error && data.data) {
      const p = data.data;
      const profile = p.end_user_profile || {};
      const sos = profile.sos_contact || {};
      const pickup = profile.pickup_location || {};
      const dropoff = profile.dropoff_location || {};
      const vehicleInfo = p.assigned_vehicle || vehicle;

      const darkMode = document.documentElement.classList.contains("dark");

      const formatVal = (val: any) =>
        val === null || val === undefined || val === "" || val === "—"
          ? "N/A"
          : val;

      const infoRow = (label: string, value: any) =>
        `<div style="padding:6px 0;font-size:14px;color:${
          darkMode ? "#e5e7eb" : "#111827"
        }"><b>${label}:</b> ${formatVal(value)}</div>`;

      await Swal.fire({
        showCloseButton: false,
        showConfirmButton: false,
        showCancelButton: false,
        width: 500,
        padding: "0",
        background: "transparent",
        html: `
        <div style="
          border-radius:22px;
          padding:2px;
          background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5);
          box-shadow:0 22px 60px rgba(0,0,0,.35);
        ">
          <div style="
            background:${darkMode ? "#020617" : "#ffffff"};
            border-radius:20px;
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
                radial-gradient(520px at top left, rgba(99,102,241,.14), transparent 40%),
                radial-gradient(420px at bottom right, rgba(34,211,238,.10), transparent 45%);
            "></div>

            <!-- HEADER -->
            <div style="
              position:relative;
              padding:16px 18px;
              background:linear-gradient(135deg,#4f46e5,#6366f1);
              display:flex;
              align-items:center;
              gap:12px;
            ">
              <div style="
                width:46px;height:46px;border-radius:14px;
                background:rgba(255,255,255,.22);
                display:flex;align-items:center;justify-content:center;
                font-size:20px;font-weight:800;color:white;
                box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
              ">
                ${(p.name || "?").charAt(0).toUpperCase()}
              </div>

              <div>
                <div style="font-size:17px;font-weight:700;color:white">
                  ${p.name || "—"}
                </div>
                <div style="font-size:12px;color:rgba(255,255,255,.85)">
                  Passenger
                </div>
              </div>
            </div>

            <!-- CONTENT -->
            <div style="position:relative;padding:18px;font-size:13px">
              ${infoRow("Email", p.email)}
              ${infoRow("Phone", p.phone_number)}
              ${infoRow(
                "SOS Contact",
                `${sos.name || "—"} (${sos.phone_number || "—"})`
              )}
              ${infoRow(
                "Pickup Location",
                pickup.name
                  ? `${pickup.name} (${pickup.address || "—"})`
                  : "—"
              )}
              ${infoRow(
                "Dropoff Location",
                dropoff.name
                  ? `${dropoff.name} (${dropoff.address || "—"})`
                  : "—"
              )}
              ${infoRow("Assigned Vehicle", vehicleInfo?.vehicle_number)}
              ${infoRow("Assigned Driver", vehicleInfo?.driver?.name)}
              ${infoRow(
                "Status",
                p.status
                  ? `<span style="background:#10b98122;color:#10b981;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Active</span>`
                  : `<span style="background:#ef444422;color:#ef4444;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Inactive</span>`
              )}
            </div>

            <!-- ACTIONS -->
            <div style="
              display:flex;
              justify-content:flex-end;
              gap:10px;
              padding:14px 18px;
              border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};
            ">
              ${
                vehicle
                  ? `<button id="unassignBtn" style="
                      background:#ef4444;
                      color:white;
                      border:none;
                      border-radius:8px;
                      padding:6px 14px;
                      font-size:13px;
                      cursor:pointer;
                    ">Unassign</button>`
                  : ""
              }

              <button id="closeBtn" style="
                background:${darkMode ? "#374151" : "#e5e7eb"};
                color:${darkMode ? "#e5e7eb" : "#111827"};
                border:none;
                border-radius:8px;
                padding:6px 14px;
                font-size:13px;
                cursor:pointer;
              ">Close</button>
            </div>

          </div>
        </div>
        `,
        customClass: { popup: "shadow-none" },
        didOpen: () => {
          document
            .getElementById("closeBtn")
            ?.addEventListener("click", () => Swal.close());

          document
            .getElementById("unassignBtn")
            ?.addEventListener("click", async () => {
              const confirm = await Swal.fire({
                title: "Confirm Unassign",
                text: `Unassign ${p.name} from ${vehicle?.vehicle_number}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Unassign",
                confirmButtonColor: "#d33",
              });

              if (confirm.isConfirmed && vehicle) {
                const payload = {
                  end_user_id: passengerId,
                  vehicle_id: vehicle.vehicle_id,
                };

                const res = await authFetch(
                  `${API_BASE_URL}/operator/assignments/unassign-end-user-from-vehicle`,
                  { method: "POST", body: JSON.stringify(payload) }
                );

                const d = await res.json();
                if (!d.error) {
                  showSuccess(d.message || "Unassigned successfully");
                  fetchVehicles(true);
                  fetchEndUsers(true);
                  Swal.close();
                }
              }
            });
        },
      });
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Unable to fetch passenger", "error");
  }
};




  // Assign passengers (single or multiple)
const handleAssignPassengers = async (vehicle: Vehicle) => {
  const darkMode = document.documentElement.classList.contains("dark");

  // Step 1: Check unassigned passengers
const availablePassengers = Array.from(
  new Map(
    endUsers
      .filter(u => !u.assigned_vehicle_id && !u.end_user_profile?.assigned_vehicle_id)
      .map(u => [u.end_user_profile?.end_user_id, u])
  ).values()
);


  if (availablePassengers.length === 0) {
    Swal.fire({
      icon: "info",
      title: "No Unassigned Passengers",
      text: "All passengers are already assigned to vehicles.",
      confirmButtonColor: "#3b82f6",
    });
    return;
  }

  // Step 2: Open Swal only when passengers exist
const { value: selectedPassengers } = await Swal.fire({
  title: "",
  width: 520,
  showCancelButton: true,
  confirmButtonText: "Assign Passengers",
  cancelButtonText: "Cancel",
  background: darkMode ? "#020617" : "#ffffff",
  color: darkMode ? "#e5e7eb" : "#111827",
  customClass: { popup: "rounded-2xl shadow-xl" },

  html: `
     <div style="
    padding:22px 24px;
    text-align:left;
    font-family:Inter,system-ui,sans-serif;
  ">
      <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">
        Assign Passengers
      </h3>

      <p style="font-size:13px;color:${darkMode ? "#9ca3af" : "#6b7280"};margin-bottom:14px">
        Select one or more passengers for <b>${vehicle.vehicle_number}</b>
      </p>

      <div id="passengers-container" style="display:flex;flex-direction:column;gap:10px">
        <select class="passenger-select" style="
          width:90%;
          height:52px;
padding:0 16px;
font-size:16px;
          border-radius:10px;
          border:1px solid ${darkMode ? "#374151" : "#d1d5db"};
          background:${darkMode ? "#020617" : "#ffffff"};
          color:${darkMode ? "#e5e7eb" : "#111827"};
        ">
          <option value="">Select Passenger</option>
          ${availablePassengers
            .map(
              (u) =>
                `<option value="${u.end_user_profile?.end_user_id}">${u.name}</option>`
            )
            .join("")}
        </select>
      </div>

      <button id="add-passenger" type="button" style="
        margin-top:12px;
        font-size:13px;
        background:${darkMode ? "#4f46e5" : "#2563eb"};
        color:white;
        padding:6px 14px;
        border-radius:8px;
        border:none;
        cursor:pointer;
      ">
        + Add another passenger
      </button>
    </div>
  `,

  didOpen: () => {
    document.getElementById("add-passenger")?.addEventListener("click", () => {
      const container = document.getElementById("passengers-container");
      if (!container) return;

      const select = document.createElement("select");
      select.className = "passenger-select";
      select.style.cssText = `
        width:90%;
        height:52px;
padding:0 16px;
font-size:16px;
        border-radius:10px;
        border:1px solid ${darkMode ? "#374151" : "#d1d5db"};
        background:${darkMode ? "#020617" : "#ffffff"};
        color:${darkMode ? "#e5e7eb" : "#111827"};
      `;
      select.innerHTML = `
        <option value="">Select Passenger</option>
        ${availablePassengers
          .map(
            (u) =>
              `<option value="${u.end_user_profile?.end_user_id}">${u.name}</option>`
          )
          .join("")}
      `;
      container.appendChild(select);
    });
  },

  preConfirm: () => {
    const selects = document.querySelectorAll(".passenger-select");
    const values = Array.from(selects)
      .map((s) => (s as HTMLSelectElement).value)
      .filter(Boolean);
    if (values.length === 0) {
      Swal.showValidationMessage("Select at least one passenger");
      return;
    }
    return [...new Set(values)];
  },
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
      if (data.error) throw new Error(data.message);
    }

    showSuccess("Passengers assigned successfully");
    fetchVehicles(true);
    fetchEndUsers(true);

  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unable to assign passengers";
    Swal.fire("Error", message, "error");
  }
};

if (loading)
  return (
    <PageShimmer />
  );




  // ---------- Render ----------
  return (
    <>
      <PageMeta title="Vehicles Management" description="Manage operator vehicles" />
      <PageBreadCrumb pageTitle="Vehicles" />
      <div className="bg-white dark:bg-gray-900 shadow border border-gray-200 dark:border-gray-800 p-6 rounded-lg max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Manage Vehicles</h2>
          {!showForm && (
            <Button
  size="sm"
  onClick={() => {
    resetForm();
    setFormStep(1);
    setEditingVehicle(null);
    setCurrentLocation(null);
    setStandingLocation(null);
    setShowForm(true);
  }}
>
  Add Vehicle
</Button>

)}
        </div>

      {showForm && (
  <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
<form
  onSubmit={(e) => {
    e.preventDefault();
    e.stopPropagation();
    if (formStep === 3) {
      handleSubmit(e);
    }
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  }}
  className="space-y-6"
>


  {/* ---------------- STEP INDICATOR ---------------- */}
  <div className="flex items-center justify-center gap-4 mb-6">
    {[1, 2, 3].map((step) => (
      <div key={step} className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
          ${formStep >= step
            ? "bg-indigo-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
        >
          {step}
        </div>
        {step < 3 && (
          <div
            className={`w-10 h-0.5
            ${formStep > step
              ? "bg-indigo-600"
              : "bg-gray-200 dark:bg-gray-700"}`}
          />
        )}
      </div>
    ))}
  </div>

  {/* ---------------- STEP 1 : VEHICLE DETAILS ---------------- */}
  {formStep === 1 && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in">

      <div>
        <label className="form-label">Vehicle Number</label>
        <input
          name="vehicle_number"
          value={form.vehicle_number}
          onChange={handleChange}
          required
          placeholder="TN 09 AB 1234"
          className="vehicle-input"
        />
      </div>

      <div>
        <label className="form-label">Vehicle Type</label>
        <select
          name="vehicle_type"
          value={form.vehicle_type}
          onChange={handleChange}
          className="vehicle-input"
        >
          <option value="bus">Bus</option>
          <option value="van">Van</option>
          <option value="car">Car</option>
        </select>
      </div>

      <div>
        <label className="form-label">Color</label>
        <input
          name="color"
          value={form.color}
          onChange={handleChange}
          placeholder="Red / Blue"
          className="vehicle-input"
        />
      </div>

      <div>
        <label className="form-label">Seating Capacity</label>
        <input
          name="seating_capacity"
          type="number"
          value={form.seating_capacity || ""}
          onChange={handleChange}
          placeholder="e.g. 40"
          className="vehicle-input"
        />
      </div>

      <div>
        <label className="form-label">Total Capacity</label>
        <input
          name="capacity"
          type="number"
          value={form.capacity || ""}
          onChange={handleChange}
          placeholder="e.g. 50"
          className="vehicle-input"
        />
      </div>

    </div>
  )}

  {/* ---------------- STEP 2 : REGISTRATION DETAILS ---------------- */}
  {formStep === 2 && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in">

      <div>
        <label className="form-label">Registration Number</label>
        <input
          name="registration_number"
          value={form.registration_number}
          onChange={handleChange}
          placeholder="TN09AB1234"
          className="vehicle-input"
        />
      </div>

      <div>
        <label className="form-label">Chassis Number</label>
        <input
          name="chassis_number"
          value={form.chassis_number}
          onChange={handleChange}
          placeholder="CHS-XXXX-1234"
          className="vehicle-input"
        />
      </div>

      <div className="md:col-span-2">
        <label className="form-label">Landmark</label>
        <input
          name="landmark"
          value={form.landmark}
          onChange={handleChange}
          placeholder="Near Bus Depot"
          className="vehicle-input"
        />
      </div>

    </div>
  )}

  {/* ---------------- STEP 3 : STANDING LOCATION ---------------- */}
  {formStep === 3 && (
    <div className="space-y-4 animate-in fade-in">

      <div className="relative h-[400px] border rounded-xl overflow-hidden">

       <button
  type="button"
  onClick={handleLocateMe}
  title="Locate me"
  className="
    absolute top-4 right-4 z-[999]
    w-11 h-11 rounded-full
    bg-white dark:bg-gray-900
    border border-indigo-300 dark:border-indigo-600
    flex items-center justify-center
    shadow-lg
    before:absolute before:inset-0 before:rounded-full
    before:animate-ping before:bg-indigo-400/30
  "
>
  <LocateFixed className="w-5 h-5 text-indigo-600 relative" />
</button>


          <div
    className="absolute bottom-3 left-3 z-[999]
    bg-white/90 dark:bg-gray-800/90
    backdrop-blur
    px-3 py-2 rounded-lg text-xs shadow"
  >
    <div className="font-medium text-gray-800 dark:text-gray-100">
      How to set standing location
    </div>
    <div className="text-gray-600 dark:text-gray-300 mt-1">
      1️⃣ Click 📍 to locate<br />
      2️⃣ Click map to set location
    </div>
  </div>

        <MapContainer
          center={currentLocation || [12.9716, 77.5946]}
          zoom={7}
          className="h-full w-full"
        >
          
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyToLocation location={currentLocation} />
            <StandingMapHandler />
            {standingLocation && (
  <Marker
    position={[
      standingLocation.latitude,
      standingLocation.longitude,
    ]}
    icon={standingIcon}
  >
    <Popup>
      <div style={{ fontSize: "13px" }}>
        <b>{standingLocation.name}</b>
        <br />
        {standingLocation.latitude.toFixed(4)},{" "}
        {standingLocation.longitude.toFixed(4)}
      </div>
    </Popup>
  </Marker>
)}

          {currentLocation && (
            <Marker position={currentLocation} icon={standingIcon}>
              <Popup>
                <strong>Standing Location</strong>
                <br />
                {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

    </div>
  )}

  {/* ---------------- NAVIGATION BUTTONS ---------------- */}
<div className="flex justify-between items-center pt-5 border-t dark:border-gray-700">
  <Button
    variant="outline"
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      if (formStep === 1) setShowForm(false);
      else setFormStep(formStep - 1);
    }}
  >
    {formStep === 1 ? "Cancel" : "Back"}
  </Button>

{formStep < 3 ? (
  <Button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setFormStep((prev) => prev + 1);
    }}
  >
    Next
  </Button>
) : (
  <Button 
    type="submit"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e as any);
    }}
  >
    {editingVehicle ? "Update Vehicle" : "Create Vehicle"}
  </Button>
)}

</div>


</form>

  </div>
)}


        {/* ---------- VEHICLE TABLE ---------- */}
        {!showForm && (
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-auto no-scrollbar">
  <table className="min-w-full text-sm">
    {/* ===== HEADER ===== */}
<thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
  <tr className="border-b border-gray-200 dark:border-gray-700">
    {[
      "Vehicle No",
      "Type",
      "Color",
      "Seating",
      "Assigned Device",
      "Assigned Driver",
      "Assigned Passengers",
      "Status",
      "Actions",
    ].map((h) => (
      <th
        key={h}
        className="px-4 py-3 text-left text-sm font-semibold
        text-gray-700 dark:text-gray-200 whitespace-nowrap"
      >
        {h}
      </th>
    ))}
  </tr>
</thead>



    {/* ===== BODY ===== */}
    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {loading ? (
        <tr>
          <td colSpan={10} className="py-6 text-center text-gray-500">
            Loading...
          </td>
        </tr>
      ) : vehicles.length === 0 ? (
        <tr>
          <td colSpan={10} className="py-10 text-center text-gray-500 italic">
            No vehicles found
          </td>
        </tr>
      ) : (
        vehicles.map((v) => {
          const deviceId =
            (v as any).assigned_device_id ||
            (v as any).assigned_device?.device_id ||
            (v as any).assigned_device?._id ||
            null;

          const driverId =
            (v as any).assigned_driver_id ||
            (v as any).assigned_driver?._id ||
            null;

          const assignedPassengers = Array.from(
            new Map(
              endUsers
                .filter(
                  (u) =>
                    u.end_user_profile?.assigned_vehicle_id === v.vehicle_id
                )
                .map((u) => [u.end_user_profile?.end_user_id, u])
            ).values()
          );

          return (
            <tr
              key={v._id}
              className="transition hover:bg-gray-50 dark:hover:bg-gray-800/60
              text-gray-700 dark:text-gray-300"
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {v.vehicle_number}
              </td>

              <td className="px-3 py-2 whitespace-nowrap">
                {v.vehicle_type}
              </td>

              <td className="px-3 py-2 whitespace-nowrap">
                {v.color}
              </td>

              <td className="px-3 py-2 whitespace-nowrap">
                {v.seating_capacity ?? "—"}
              </td>

              {/* Assigned Device */}
              <td className="px-3 py-2 whitespace-nowrap">
                {deviceId ? (
                  <button
                    onClick={() => handleViewDevice(deviceId, v)}
                    className="text-xs px-3 py-1 rounded-md
                    bg-gray-100 text-gray-700 hover:bg-gray-200
                    dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    View
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssignDevice(v)}
                    className="text-xs px-3 py-1 rounded-md
                    bg-green-100 text-green-700 hover:bg-green-200
                    dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition"
                  >
                    Assign
                  </button>
                )}
              </td>

              {/* Assigned Driver */}
              <td className="px-3 py-2 whitespace-nowrap">
                {driverId ? (
                  <button
                    onClick={() => handleViewDriver(driverId, v)}
                    className="text-xs px-3 py-1 rounded-md
                    bg-gray-100 text-gray-700 hover:bg-gray-200
                    dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    View
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssignDriver(v)}
                    className="text-xs px-3 py-1 rounded-md
                    bg-green-100 text-green-700 hover:bg-green-200
                    dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition"
                  >
                    Assign
                  </button>
                )}
              </td>

              {/* Assigned Passengers */}
         <td className="px-3 py-2 whitespace-nowrap">
  <div className="flex items-center gap-2">
    {/* Assign button */}
    <button
      onClick={() => handleAssignPassengers(v)}
      className="text-xs px-3 py-1 rounded-md
      bg-blue-100 text-blue-700 hover:bg-blue-200
      dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition"
    >
      Assign
    </button>

    {/* Single View button */}
    {assignedPassengers.length > 0 && (
      <button
        onClick={() => handleViewAllPassengers(v, assignedPassengers)}
        className="p-2 rounded-md text-blue-400 dark:text-gray-300
        hover:bg-blue-50 hover:text-blue-600
        dark:hover:bg-blue-900/40 transition"
        title="View Passengers"
      >
        <EyeIcon />
      </button>
    )}
  </div>
</td>




              {/* Status */}
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    v.status
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}
                >
                  {v.status ? "Active" : "Inactive"}
                </span>
              </td>

              {/* Actions */}
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(v)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    {v.status ? <DeactivateIcon /> : <ActivateIcon />}
                  </button>

                  <button
                    onClick={() => handleView(v)}
                    className="p-2 rounded-md text-blue-400 dark:text-gray-300
                    hover:bg-blue-50 hover:text-blue-600
                    dark:hover:bg-blue-900/40 transition"
                  >
                    <EyeIcon />
                  </button>

                  <button
                    onClick={() => handleEdit(v)}
                    className="p-2 rounded-md text-gray-600 dark:text-gray-300
                    hover:bg-indigo-50 hover:text-indigo-600
                    dark:hover:bg-indigo-900/40 transition"
                  >
                    <EditIcon />
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

        )}
      </div>
    </>
  );
}
