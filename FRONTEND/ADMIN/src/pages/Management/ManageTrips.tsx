import { useEffect, useState } from "react"; 
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet"; 
import L from "leaflet";
import OpenStreetRoute from "../../components/OpenStreetRoute";
import PageShimmer from "../../components/common/PageShimmer";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";



const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const stopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});


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

type RoutePoint = {
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  dwell_target_seconds?: number;
  sla_arrival_buffer_seconds?: number;
    approximate_reach_time?: string; // e.g. "08:15"
  landmark?: string;
};

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

// ✅ UPDATED: Trip interface
interface Trip {
  _id: string;
    scheduled_trip_id: string;
    route_name: string; 
  driver_id: string;
  vehicle_id: string;
  start_location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  end_location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  status: "pending" | "in-progress" | "started" | "completed" | "cancelled";
   scheduled_start_time: string;
   trip_type: "pickup" | "drop";
  trip_period: "morning" | "afternoon" | "evening";
  repeat_days: { 
    Monday: boolean;
    Tuesday: boolean;
    Wednesday: boolean;
    Thursday: boolean;
    Friday: boolean;
    Saturday: boolean;
    Sunday: boolean;
  };
  route_points: RoutePoint[]; 
}


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

 
// ✅ Locate Me button inside map - Logic updated to remove 'You are here' icon
function LocateMeButton({
  setCoords,
}: {
  setCoords: (coords: { latitude: number; longitude: number }) => void;
}) {
  const map = useMap();

  const handleLocate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!navigator.geolocation) {
      Swal.fire("Error", "Geolocation not supported by this browser", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        map.setView([latitude, longitude], 17);
       // Marker removed to only show current location on the map center, not as an explicit marker
      },
      (err) => {
        Swal.fire("Error", "Unable to fetch your location", "error");
        console.error(err);
      }
    );
  };

  return (
    <button
      type="button"
      onClick={handleLocate}
      // 🛑 Z-index changed to 4000 to be above the fullscreen map (z-3000)
      className="absolute top-2 right-2 z-[4000] bg-white dark:bg-gray-800 rounded-full shadow-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700" 
      title="Locate Me"
    >
      📍
    </button>
  );
}

// Map click handler
const LocationMarker = ({
  setLocation,
}: {
  setLocation: React.Dispatch<
    React.SetStateAction<{ address: string; latitude: number; longitude: number }>
  >;
}) => {
  useMapEvents({
    click(e) {
      setLocation({
        address: "", 
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });
  return null;
};

const StopMarker = ({
  routePoints,
  setRoutePoints,
  startLocation,
  endLocation,
}: {
  routePoints: RoutePoint[];
  setRoutePoints: React.Dispatch<React.SetStateAction<RoutePoint[]>>;
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
}) => {
  useMapEvents({
    click(e) {
     const isStartSelected =
  startLocation.latitude !== 0 && startLocation.longitude !== 0;

const isEndSelected =
  endLocation.latitude !== 0 && endLocation.longitude !== 0;

if (!isStartSelected || !isEndSelected) {
  Swal.fire("Info", "Select start and end location first.", "info");
  return;
}


      const target = e.originalEvent.target as HTMLElement;

      // Only trigger popup if clicking on map background
      if (target.classList.contains("leaflet-container") || target.tagName === "IMG") {
        const seq = routePoints.length + 1;

        Swal.fire({
          title: `Add Stop ${seq}`,
          html: `
          <input id="swal-stop-name" class="swal2-input" placeholder="Stop Name">
              <input id="swal-landmark" class="swal2-input" placeholder="Nearby Landmark">
              <input id="swal-reach-time" type="time" class="swal2-input"placeholder="Approximate Reach Time">
              <input id="swal-dwell" type="number" class="swal2-input" placeholder="Dwell Time (seconds)" value="150">
              <input id="swal-sla" type="number" class="swal2-input" placeholder="SLA Arrival Buffer (seconds)" value="240">
          `,
          showCancelButton: true,
          confirmButtonText: "Add Stop",
          preConfirm: () => {
            const name = (document.getElementById("swal-stop-name") as HTMLInputElement)?.value;
               const landmark = (document.getElementById("swal-landmark") as HTMLInputElement)?.value;
               const reachTime = (document.getElementById("swal-reach-time") as HTMLInputElement)?.value;
               const dwell = Number((document.getElementById("swal-dwell") as HTMLInputElement)?.value || 150);
               const sla = Number((document.getElementById("swal-sla") as HTMLInputElement)?.value || 240);

            if (!name) {
              Swal.showValidationMessage("Stop name is required");
              return null;
            }
            return { name, landmark, reachTime, dwell, sla };
          },
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const { name, landmark, reachTime,  dwell, sla } = result.value;
            setRoutePoints((prev) => 
                [...prev,
                  {
                    name,
                    latitude: e.latlng.lat,
                    longitude: e.latlng.lng,
                    sequence: seq,
                    dwell_target_seconds: dwell,
                    sla_arrival_buffer_seconds: sla,
                    approximate_reach_time: reachTime || "",
        landmark: landmark || "",
                  },
                ].sort((a, b) => a.sequence - b.sequence) // Maintain sort order
            );
          }
        });
      }
    },
  });

  return null;
};

interface FullscreenToggleProps {
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
}


export default function ManageTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false); 
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [vehicles   , setVehicles] = useState<
  { _id: string; vehicle_number: string; vehicle_id: string }[]
>([]);

const [drivers, setDrivers] = useState<
  { _id: string; name: string; driver_id: string }[]
>([]);


  const [routeName, setRouteName] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [tripType, setTripType] = useState<"pickup" | "drop">("pickup");
  const [startLocation, setStartLocation] = useState({
    address: "",
    latitude: 0,
    longitude: 0,
  });
  const [endLocation, setEndLocation] = useState({
    address: "",
    latitude: 0,
    longitude: 0,
  });
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
const [scheduledStartTime, setScheduledStartTime] = useState("06:00");
const [tripPeriod, setTripPeriod] = useState("morning");
const [repeatDays, setRepeatDays] = useState({
  Monday: false,
  Tuesday: false,
  Wednesday: false,
  Thursday: false,
  Friday: false,
  Saturday: false,
  Sunday: false,
});

// Pagination state for vehicles
const [vehiclePage, setVehiclePage] = useState(1);
const [hasMoreVehicles, setHasMoreVehicles] = useState(true);

// Pagination state for drivers
const [driverPage, setDriverPage] = useState(1);
const [hasMoreDrivers, setHasMoreDrivers] = useState(true);

// Pagination state for trips
const [tripPage, setTripPage] = useState(1);
const [hasMoreTrips, setHasMoreTrips] = useState(true);

const [formStep, setFormStep] = useState(1);

const pageSize = 10;
const [loadingMore, setLoadingMore] = useState(false);


const fetchVehicles = async (reset = false) => {
  try {
    const token = localStorage.getItem("token");

    if (reset) setVehiclePage(1);
    else setLoadingMore(true);

    const pageToFetch = reset ? 1 : vehiclePage;

    const res = await fetch(`${BASE_URL}/operator/vehicles/list?page=${pageToFetch}&limit=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.error === false && data.data) {
      const mapped = data.data.map((v: any) => ({
        _id: v._id,
        vehicle_number: v.vehicle_number,
        vehicle_id: v.vehicle_id,
      }));

      setVehicles(prev => reset ? mapped : [...prev, ...mapped]);
      setHasMoreVehicles(mapped.length === pageSize);
    }
  } finally {
    setLoadingMore(false);
  }
};


const fetchDrivers = async (reset = false) => {
  try {
    const token = localStorage.getItem("token");

    if (reset) setDriverPage(1);
    else setLoadingMore(true);

    const pageToFetch = reset ? 1 : driverPage;

    const res = await fetch(`${BASE_URL}/operator/drivers/list?page=${pageToFetch}&limit=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.error === false && data.data) {
      const mapped = data.data.map((d: any) => ({
        _id: d._id,
        name: d.name,
        driver_id: d.driver_profile.driver_id,
      }));

      setDrivers(prev => reset ? mapped : [...prev, ...mapped]);
      setHasMoreDrivers(mapped.length === pageSize);
    }
  } finally {
    setLoadingMore(false);
  }
};



const fetchTrips = async (reset = false) => {
  try {
    const token = localStorage.getItem("token");

    if (reset) setTripPage(1);
    else setLoadingMore(true);

    const pageToFetch = reset ? 1 : tripPage;

    const res = await fetch(`${BASE_URL}/operator/scheduled-trips/list?page=${pageToFetch}&limit=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data?.data) {
      setTrips(prev => reset ? data.data : [...prev, ...data.data]);
      setHasMoreTrips(data.data.length === pageSize);
    }
  } finally {
    setLoadingMore(false);
  }
};

useEffect(() => {
  fetchVehicles(true);
  fetchDrivers(true);
  fetchTrips(true);
}, [refresh]);



  // ✅ Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.values(repeatDays).every(day => day === false)) {
        Swal.fire("Error", "At least one repeat day must be selected.", "error");
        return;
    }


 const payload = {
  route_name: routeName,
   driver_id: driverId,  
  vehicle_id: vehicleId, 
  scheduled_start_time: scheduledStartTime,
  trip_period: tripPeriod,
    trip_type: tripType,
  repeat_days: repeatDays,
  start_location: {
    latitude: startLocation.latitude,
    longitude: startLocation.longitude,
    address: startLocation.address || "Start Point",
  },
  end_location: {
    latitude: endLocation.latitude,
    longitude: endLocation.longitude,
    address: endLocation.address || "End Point",
  },
route_points: (routePoints || []).map((stop, index) => ({
    name: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sequence: index + 1,
    dwell_target_seconds: stop.dwell_target_seconds || 150,
    sla_arrival_buffer_seconds: stop.sla_arrival_buffer_seconds || 240,
      approximate_reach_time: stop.approximate_reach_time || null,
  landmark: stop.landmark || null,

  })),
};



    try {
      const token = localStorage.getItem("token");
      const url = editingTripId
        ? `${BASE_URL}/operator/scheduled-trips/${editingTripId}/update`
        : `${BASE_URL}/operator/scheduled-trips/create`;

      const res = await fetch(url, {
        method: editingTripId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
     if (data.error === false) {
 showSuccess(`Trip ${editingTripId ? "updated" : "created"} successfully`);  resetForm();
  setShowForm(false);
  setRefresh((p) => !p);
} else {
  Swal.fire("Error", data.message || "Something went wrong", "error");
}

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Server error", "error");
    }
  };

 const resetForm = () => {
    setRouteName("");
  setDriverId("");
  setVehicleId("");
  setStartLocation({ address: "", latitude: 0, longitude: 0 });
  setEndLocation({ address: "", latitude: 0, longitude: 0 });
  setScheduledStartTime("06:00");
  setTripPeriod("morning");
  setRepeatDays({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false,
  });
  setRoutePoints([]); 
  setEditingTripId(null);
  setFormStep(1);
};

// ✅ Stop removal function
const handleDeleteStop = (indexToDelete: number) => {
  setRoutePoints(prevPoints => {
    const newPoints = prevPoints.filter((_, index) => index !== indexToDelete);
    // Recalculate sequence numbers
    return newPoints.map((point, index) => ({
      ...point,
      sequence: index + 1,
    }));
  });
};
const handleEditStop = (indexToEdit: number) => {
  const stop = routePoints[indexToEdit];

  Swal.fire({
    title: `Edit Stop ${stop.sequence}`,
    html: `
      <input id="swal-stop-name" class="swal2-input" placeholder="Stop Name" value="${stop.name}">
      <input id="swal-landmark" class="swal2-input" placeholder="Nearby Landmark" value="${stop.landmark || ""}">
      <input id="swal-reach-time" type="time" class="swal2-input" value="${stop.approximate_reach_time || ""}">
      <input id="swal-dwell" type="number" class="swal2-input" placeholder="Dwell Time (seconds)" value="${stop.dwell_target_seconds || 150}">
      <input id="swal-sla" type="number" class="swal2-input" placeholder="SLA Arrival Buffer (seconds)" value="${stop.sla_arrival_buffer_seconds || 240}">
    `,
    showCancelButton: true,
    confirmButtonText: "Update Stop",
    preConfirm: () => {
      const name = (document.getElementById("swal-stop-name") as HTMLInputElement)?.value;
      if (!name) {
        Swal.showValidationMessage("Stop name is required");
        return null;
      }

      return {
        name,
        landmark: (document.getElementById("swal-landmark") as HTMLInputElement)?.value || "",
        reachTime: (document.getElementById("swal-reach-time") as HTMLInputElement)?.value || "",
        dwell: Number((document.getElementById("swal-dwell") as HTMLInputElement)?.value || 150),
        sla: Number((document.getElementById("swal-sla") as HTMLInputElement)?.value || 240),
      };
    },
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      setRoutePoints((prev) =>
        prev.map((p, idx) =>
          idx === indexToEdit
            ? {
                ...p,
                name: result.value.name,
                landmark: result.value.landmark,
                approximate_reach_time: result.value.reachTime,
                dwell_target_seconds: result.value.dwell,
                sla_arrival_buffer_seconds: result.value.sla,
              }
            : p
        )
      );
    }
  });
};


const handleView = async (trip: Trip) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${BASE_URL}/operator/scheduled-trips/${trip.scheduled_trip_id}/view`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();

    if (data.error) {
      Swal.fire("Error", data.message || "Failed to fetch trip details", "error");
      return;
    }

    const t = data.data;
    const darkMode = document.documentElement.classList.contains("dark");

    // Helper for info rows
    const infoRow = (label: string, value: string | number | null | undefined): string => `
      <div style="
        font-size:14px;
        font-weight:500;
        padding:4px 0;
        color:${darkMode ? "#e5e7eb" : "#111827"};
      ">
        <b>${label} :</b> ${value ?? "N/A"}
      </div>
    `;

    // Driver & Vehicle
    const driverName = drivers.find((d) => d.driver_id === t.driver_id)?.name || "N/A";
    const vehicleNumber = vehicles.find((v) => v.vehicle_id === t.vehicle_id)?.vehicle_number || "N/A";

    // Repeat Days
    const repeatDaysStr =
      Object.keys(t.repeat_days)
        .filter((day) =>
          ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(day)
        )
        .filter((day) => t.repeat_days[day])
        .join(", ") || "None";

    // Status Badge
    let statusColor = "#999"; // default gray
    switch (t.status) {
      case "pending": statusColor = "#eab308"; break; // yellow
      case "in-progress": statusColor = "#f97316"; break;  // orange
      case "started": statusColor = "#16a34a"; break; // green
      case "completed": statusColor = "#2563eb"; break; // blue
      case "cancelled": statusColor = "#dc2626"; break; // red
    }
    const statusBadge = `<span style="
      background-color:${statusColor}22;
      color:${statusColor};
      font-weight:bold;
      padding:3px 8px;
      border-radius:6px;
      font-size:12px;
      text-transform:capitalize;
    ">${t.status === "in-progress" ? "In Progress" : t.status}</span>`;

    // SweetAlert Trip View
 Swal.fire({
  showCloseButton: true,
  showConfirmButton: false,
  width: 620,
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
          ${t.route_name.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style="font-size:20px; font-weight:800; color:white;">
            ${t.route_name}
          </div>
          <div style="font-size:13px; color:rgba(255,255,255,.85);">
            Trip Period: ${t.trip_period}
          </div>
        </div>
      </div>

      <!-- BODY -->
      <div style="
        position:relative;
        padding:24px;
        color:${darkMode ? "#e5e7eb" : "#111827"};
      ">

        <!-- BASIC INFO -->
        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          font-size:14px;
        ">
          <div><b>Driver:</b> ${driverName}</div>
          <div><b>Vehicle:</b> ${vehicleNumber}</div>
          <div><b>Start Time:</b> ${t.scheduled_start_time}</div>
          <div><b>Repeat Days:</b> ${repeatDaysStr}</div>
          <div>
            <b>Status:</b>
            <span style="margin-left:6px;">${statusBadge}</span>
          </div>
          <div><b>Trip Type:</b> ${t.trip_type}</div>
        </div>

        <hr style="
          border:none;
          border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};
          margin:18px 0;
        "/>

        <!-- LOCATIONS -->
        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
          font-size:14px;
        ">
          <div>
            <b>Start Location</b>
            <p style="margin:4px 0; color:${darkMode ? "#9ca3af" : "#4b5563"}">
              ${t.start_location.address}
            </p>
            <p style="font-size:12px;">
              Lat: ${t.start_location.latitude.toFixed(4)},
              Lng: ${t.start_location.longitude.toFixed(4)}
            </p>
          </div>

          <div>
            <b>End Location</b>
            <p style="margin:4px 0; color:${darkMode ? "#9ca3af" : "#4b5563"}">
              ${t.end_location.address}
            </p>
            <p style="font-size:12px;">
              Lat: ${t.end_location.latitude.toFixed(4)},
              Lng: ${t.end_location.longitude.toFixed(4)}
            </p>
          </div>
        </div>

        <hr style="
          border:none;
          border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};
          margin:18px 0;
        "/>

        <!-- ROUTE STOPS -->
        <div style="font-size:14px;">
          <b>Route Stops</b>
          <ul style="margin-top:6px; padding-left:18px; line-height:1.6;">
            ${(t.route_points || [])
              .sort((a: RoutePoint, b: RoutePoint) => a.sequence - b.sequence)
              .map(
                (stop: any) => `
                  <li>
                    <b>${stop.name}</b>
                    <span style="color:${darkMode ? "#9ca3af" : "#6b7280"}">
                      (Seq: ${stop.sequence},
                      Lat: ${stop.latitude.toFixed(4)},
                      Lng: ${stop.longitude.toFixed(4)})
                    </span>
                  </li>
                `
              )
              .join("")}
          </ul>
        </div>

      </div>
    </div>
  </div>
  `,
  customClass: { popup: "shadow-none" },
});


  } catch (err) {
    console.error("Error fetching trip:", err);
    Swal.fire("Error", "Server error while fetching trip details", "error");
  }
};


// ✅ UPDATED: handleEdit is async and fetches full details
const handleEdit = async (trip: Trip) => { 
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${BASE_URL}/operator/scheduled-trips/${trip.scheduled_trip_id}/view`, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();

    if (data.error || !data.data) {
       Swal.fire("Error", "Failed to fetch full trip details for editing.", "error");
       return;
    }

    const fullTrip: Trip = data.data; 

    setRouteName(fullTrip.route_name);
    setDriverId(fullTrip.driver_id);
    setVehicleId(fullTrip.vehicle_id);
    setStartLocation(fullTrip.start_location);
    setEndLocation(fullTrip.end_location);
    setEditingTripId(fullTrip.scheduled_trip_id);
    setFormStep(1);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScheduledStartTime(fullTrip.scheduled_start_time || "06:00");
    setTripPeriod(fullTrip.trip_period || "morning");

    // FIX: Set route points for editing
    const sortedRoutePoints = (fullTrip.route_points || [])
      .filter((point: RoutePoint) => point.latitude !== 0 && point.longitude !== 0)
      .sort((a, b) => a.sequence - b.sequence);
    setRoutePoints(sortedRoutePoints);

    // Set repeat days from full trip data
    const cleanRepeatDays: typeof repeatDays = {
      Monday: fullTrip.repeat_days.Monday || false,
      Tuesday: fullTrip.repeat_days.Tuesday || false,
      Wednesday: fullTrip.repeat_days.Wednesday || false,
      Thursday: fullTrip.repeat_days.Thursday || false,
      Friday: fullTrip.repeat_days.Friday || false,
      Saturday: fullTrip.repeat_days.Saturday || false,
      Sunday: fullTrip.repeat_days.Sunday || false,
    };

    setRepeatDays(cleanRepeatDays);
  } catch (err) {
     console.error("Error editing trip:", err);
     Swal.fire("Error", "Server error while fetching trip details for editing", "error");
  }
};


const handleActivateDeactivate = async (trip: Trip) => {
  try {
    if (!trip.scheduled_trip_id) {
      Swal.fire("Error", "Trip ID missing — cannot update status.", "error");
      return;
    }

    const isActive = trip.status === "started" || trip.status === "pending"; 
    const action = isActive ? "deactivate" : "activate";

    const confirm = await Swal.fire({
      title: `${action === "deactivate" ? "Deactivate" : "Activate"} Trip?`,
      text: `Are you sure you want to ${action} this trip (${trip.route_name})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText:
        action === "deactivate" ? "Yes, Deactivate" : "Yes, Activate",
    });

    if (!confirm.isConfirmed) return;

    const token = localStorage.getItem("token");
    const res = await fetch(
      `${BASE_URL}/operator/scheduled-trips/${trip.scheduled_trip_id}/${action}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    if (!data.error) {
       showSuccess(data.message || `Trip ${action}d successfully`);
      setRefresh((p) => !p);
    } else {
      Swal.fire("Error", data.message || "Failed to update trip status", "error");
    }
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Server error while updating trip status", "error");
  }
};

// 🛑 Existing state for Stops Map fullscreen
const [isFullscreen, setIsFullscreen] = useState(false); 

// ✅ NEW states for Start and End Maps
const [isStartMapFullscreen, setIsStartMapFullscreen] = useState(false);
const [isEndMapFullscreen, setIsEndMapFullscreen] = useState(false);

useEffect(() => {
  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (isStartMapFullscreen) setIsStartMapFullscreen(false);
      if (isEndMapFullscreen) setIsEndMapFullscreen(false);
      if (isFullscreen) setIsFullscreen(false); // For the route stops map if implemented
    }
  };

  document.addEventListener('keydown', handleEsc);

  return () => {
    document.removeEventListener('keydown', handleEsc);
  };
}, [isStartMapFullscreen, isEndMapFullscreen, isFullscreen]);

const handleNext = (e: React.MouseEvent) => {
  e.preventDefault();
 if (formStep === 1) {
  if (!routeName.trim()) {
    Swal.fire("Error", "Route Name is required", "error");
    return;
  }

  if (routeName.length > 50) {
    Swal.fire(
      "Error",
      "Route Name must not exceed 50 characters",
      "error"
    );
    return;
  }

  if (!driverId) {
    Swal.fire("Error", "Please select a driver", "error");
    return;
  }

  if (!vehicleId) {
    Swal.fire("Error", "Please select a vehicle", "error");
    return;
  }

  if (!scheduledStartTime) {
    Swal.fire("Error", "Scheduled Start Time is required", "error");
    return;
  }
}

  
  if (formStep === 2) {
    if (Object.values(repeatDays).every(day => day === false)) {
      Swal.fire("Error", "At least one repeat day must be selected.", "error");
      return;
    }
  }

  if (formStep === 3) {
    if (startLocation.latitude === 0 || startLocation.longitude === 0) {
      Swal.fire("Error", "Please select a start location on the map", "error");
      return;
    }
  }

  if (formStep === 4) {
    if (endLocation.latitude === 0 || endLocation.longitude === 0) {
      Swal.fire("Error", "Please select an end location on the map", "error");
      return;
    }
  }

  setFormStep(p => p + 1);
};


if (loading)
  return (
    <PageShimmer />
  );




  
  return (
    <>
      <PageMeta title="Manage Trips" description="Manage, create, and update scheduled trips" />
      <div>
      <PageBreadCrumb pageTitle="Trip Management" />

      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Trips</h2>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm((p) => !p);
            }}
          >
            {showForm ? "Close Form" : "+ Create Trip"}
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              {editingTripId ? "Edit Trip" : "Create Trip"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Step Indicator */}
             <div className="flex items-center justify-center gap-4 mb-6">
  {[1, 2, 3, 4, 5].map((step) => (
    <div key={step} className="flex items-center gap-2">
      
      {/* STEP CIRCLE */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          text-xs font-bold transition-all duration-300
          ${
            formStep >= step
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-500"
          }
        `}
      >
        {step}
      </div>

      {/* CONNECTOR LINE */}
      {step < 5 && (
        <div
          className={`
            w-10 h-0.5 transition-all duration-300
            ${
              formStep > step
                ? "bg-indigo-600"
                : "bg-gray-200 dark:bg-gray-700"
            }
          `}
        />
      )}
    </div>
  ))}
</div>

              

              {/* STEP 1 */}
              {formStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Route Name</label>
                   <input
  type="text"
  value={routeName}
  onChange={(e) => {
    if (e.target.value.length <= 50) {
      setRouteName(e.target.value);
    }
  }}
  maxLength={50}
  className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
  required
/>
<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
  {routeName.length}/50 characters
</p>

                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Driver</label>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">Select Driver</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d.driver_id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Vehicle</label>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v._id} value={v.vehicle_id}>
                          {v.vehicle_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Scheduled Start Time</label>
                    <input
                      type="time"
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-medium">Trip Period</label>
                      <select
                        value={tripPeriod}
                        onChange={(e) => setTripPeriod(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 font-medium">Trip Type</label>
                      <select
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value as "pickup" | "drop")}
                        className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="pickup">Pickup</option>
                        <option value="drop">Drop</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Repeat Days (at least one day required)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.keys(repeatDays).map((day) => (
                        <label
                          key={day}
                          className="flex items-center gap-2 text-gray-800 dark:text-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={repeatDays[day as keyof typeof repeatDays]}
                            onChange={(e) =>
                              setRepeatDays((prev) => ({
                                ...prev,
                                [day]: e.target.checked,
                              }))
                            }
                            className="accent-blue-600"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {formStep === 3 && (
                <div className="space-y-4">
                  {/* Start Location Map & Address */}
                  <div>
                    <label className="block mb-2 font-medium">Start Location (Click Map to Pin)</label>
                    <div className={`${isStartMapFullscreen ? "fixed inset-0 z-[3000]" : "h-80"} relative border rounded-lg mb-4`}>
                      <MapContainer
                        center={[startLocation.latitude || 20.5937, startLocation.longitude || 78.9629]} 
                        zoom={startLocation.latitude !== 0 ? 14 : 5}
                        className="h-full w-full rounded border border-gray-300 dark:border-gray-700"
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationMarker setLocation={setStartLocation} /> 
                        
                        {startLocation.latitude !== 0 && (
                          <Marker position={[startLocation.latitude, startLocation.longitude]} icon={startIcon}>
                            <Popup>Start Location</Popup>
                          </Marker>
                        )}

                        <LocateMeButton
                          setCoords={(coords) => setStartLocation({ ...startLocation, ...coords, address: startLocation.address || 'User Location' })}
                        />
                      </MapContainer>
                    </div>

                    <label className="block mb-1 font-medium">Start Location Address</label>
                    <input
                      type="text"
                      value={startLocation.address}
                      onChange={(e) =>
                        setStartLocation((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="Enter start address"
                      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Lat: {startLocation.latitude.toFixed(4)}, Lng: {startLocation.longitude.toFixed(4)}</p>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {formStep === 4 && (
                <div className="space-y-4">
                  {/* End Location Map & Address */}
                  <div>
                    <label className="block mb-2 font-medium">End Location (Click Map to Pin)</label>
                    <div className={`${isEndMapFullscreen ? "fixed inset-0 z-[3000]" : "h-80"} relative border rounded-lg mb-4`}>
                      <MapContainer
                        center={[endLocation.latitude || 20.5937, endLocation.longitude || 78.9629]}
                        zoom={endLocation.latitude !== 0 ? 14 : 5}
                        className="h-full w-full rounded border border-gray-300 dark:border-gray-700"
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationMarker setLocation={setEndLocation} />
                        {endLocation.latitude !== 0 && (
                          <Marker
                            position={[endLocation.latitude, endLocation.longitude]}
                            icon={endIcon}
                          >
                            <Popup>End Location</Popup>
                          </Marker>
                        )}
                        <LocateMeButton
                          setCoords={(coords) => setEndLocation({ ...endLocation, ...coords, address: endLocation.address || 'User Location' })}
                        />
                      </MapContainer>
                    </div>

                    <label className="block mb-1 font-medium">End Location Address</label>
                    <input
                      type="text"
                      value={endLocation.address}
                      onChange={(e) =>
                        setEndLocation((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="Enter end address"
                      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                    />
                     <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Lat: {endLocation.latitude.toFixed(4)}, Lng: {endLocation.longitude.toFixed(4)}</p>
                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {formStep === 5 && (
                <div className="space-y-4">
                  {/* Route Stops */}
                  <div className="relative mt-4">
                    <label className="block mb-2 font-medium">Add Route Stops (Click Map)</label>
                    <div className={`${isFullscreen ? "fixed inset-0 z-[3000]" : "h-[400px]"} relative border rounded-lg`}>
                      <MapContainer
                        center={[startLocation.latitude || 20.5937, startLocation.longitude || 78.9629]} 
                        zoom={startLocation.latitude !== 0 ? 12 : 5} 
                        className="h-full w-full rounded border border-gray-300 dark:border-gray-700"
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        
                        {startLocation.latitude !== 0 && startLocation.longitude !== 0 && (
                          <Marker
                            position={[startLocation.latitude, startLocation.longitude]}
                            icon={startIcon}
                          >
                            <Popup>Start Location: {startLocation.address || 'Source'}</Popup>
                          </Marker>
                        )}

                        {endLocation.latitude !== 0 && endLocation.longitude !== 0 && (
                          <Marker
                            position={[endLocation.latitude, endLocation.longitude]}
                            icon={endIcon}
                          >
                            <Popup>End Location: {endLocation.address || 'Destination'}</Popup>
                          </Marker>
                        )}

                        {routePoints.map((stop, index) => (
                          <Marker
                            key={index}
                            position={[stop.latitude, stop.longitude]}
                            icon={stopIcon}
                          >
                            <Popup>
                              <div>
                                <strong>Stop {stop.sequence}: {stop.name}</strong>
                                <p className="text-xs mt-1">Lat: {stop.latitude.toFixed(4)}, Lng: {stop.longitude.toFixed(4)}</p>
                                <button
                                  className="text-red-500 hover:text-red-700 text-xs mt-1"
                                  onClick={() => handleDeleteStop(index)}
                                >
                                  Remove Stop
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}

                        {startLocation.latitude !== 0 && endLocation.latitude !== 0 && (
                          <OpenStreetRoute
                            startLocation={startLocation}
                            endLocation={endLocation}
                            stops={routePoints}
                          />
                        )}
                        
                        <StopMarker
                          routePoints={routePoints}
                          setRoutePoints={setRoutePoints}
                          startLocation={startLocation}
                          endLocation={endLocation}
                        />
                        
                        <LocateMeButton
                          setCoords={() => {}}
                        />
                      </MapContainer>
                    </div>
                  </div>

                  {/* Stops List */}
                  {routePoints.length > 0 && (
                    <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
                      <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">Added Stops</h4>
                      <ul className="space-y-2">
                        {routePoints.sort((a, b) => a.sequence - b.sequence).map((stop, index) => (
                          <li
                            key={stop.sequence}
                            className="flex items-center justify-between bg-white dark:bg-gray-700 px-3 py-2 rounded shadow-sm"
                          >
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{stop.name} (Seq: {stop.sequence})</p>
                              <p className="text-sm text-gray-500 dark:text-gray-300">
                                Lat: {stop.latitude.toFixed(4)}, Lng: {stop.longitude.toFixed(4)}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-300">
                                Dwell: {stop.dwell_target_seconds}s, SLA Buffer: {stop.sla_arrival_buffer_seconds}s
                              </p>
                              {stop.landmark && (
  <p className="text-sm text-gray-500 dark:text-gray-300">
    Landmark: {stop.landmark}
  </p>
)}

{stop.approximate_reach_time && (
  <p className="text-sm text-gray-500 dark:text-gray-300">
    Reach Time: {stop.approximate_reach_time}
  </p>
)}

                            </div>
                            {/* <button
                              type="button"
                              onClick={() => handleDeleteStop(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                              title="Remove Stop"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button> */}
                            <div className="flex items-center gap-2">
  {/* EDIT */}
  <button
    type="button"
    onClick={() => handleEditStop(index)}
    className="text-indigo-500 hover:text-indigo-700 p-1 rounded transition"
    title="Edit Stop"
  >
    ✏️
  </button>

  {/* DELETE */}
  <button
    type="button"
    onClick={() => handleDeleteStop(index)}
    className="text-red-500 hover:text-red-700 p-1 rounded transition"
    title="Remove Stop"
  >
    🗑️
  </button>
</div>

                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* NAVIGATION */}
              <div className="flex justify-between items-center mt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formStep === 1}
                  onClick={(e) => { e?.preventDefault(); setFormStep(p => p - 1); }}
                >
                  Back
                </Button>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e?.preventDefault(); setShowForm(false); }}
                  >
                    Cancel
                  </Button>

                  {formStep < 5 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button size="sm" type="submit">
                      {editingTripId ? "Update Trip" : "Create Trip"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Trip Table */}
        {!showForm &&(
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-auto no-scrollbar">
          <table className="w-full text-sm">
    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
      <tr className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {[
          "Route Name",
          "Driver Name",
          "Vehicle Number",
          "Start Time",
          "Repeat Days",
          "Trip Status",
          "Actions",
        ].map((h) => (
          <th
            key={h}
            className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>

    <tbody>
      {trips.map((trip, idx) => {
        const repeatDaysStr =
          Object.keys(trip.repeat_days)
            .filter((day) =>
              [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].includes(day)
            )
            .filter(
              (day) =>
                trip.repeat_days[
                  day as keyof typeof trip.repeat_days
                ]
            )
            .join(", ") || "None";

        return (
          <tr
            key={trip._id}
            className={`border-t dark:border-gray-700
            ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
            hover:bg-blue-50/50 dark:hover:bg-gray-700 transition`}
          >
            {/* Route Name */}
            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {trip.route_name}
            </td>

            {/* Driver */}
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                  {drivers
                    .find((d) => d.driver_id === trip.driver_id)
                    ?.name?.charAt(0)
                    .toUpperCase() || "?"}
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  {drivers.find((d) => d.driver_id === trip.driver_id)?.name ||
                    "N/A"}
                </span>
              </div>
            </td>

            {/* Vehicle */}
            <td className="px-4 py-3 whitespace-nowrap">
  <span
    className="
      px-2 py-1 rounded text-xs font-medium
      bg-gray-100 text-gray-800
      dark:bg-gray-700 dark:text-gray-100
      border border-gray-300 dark:border-gray-600
    "
  >
    {vehicles.find((v) => v.vehicle_id === trip.vehicle_id)
      ?.vehicle_number || "N/A"}
  </span>
</td>


            {/* Start Time */}
            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
              {trip.scheduled_start_time}
            </td>

            {/* Repeat Days */}
            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
              {repeatDaysStr}
            </td>

            {/* Status */}
            <td className="px-4 py-3 whitespace-nowrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  trip.status === "pending"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                    : trip.status === "in-progress"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                    : trip.status === "started"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : trip.status === "completed"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                    : trip.status === "cancelled"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400"
                }`}
              >
                {trip.status === "in-progress"
                  ? "In Progress"
                  : trip.status.charAt(0).toUpperCase() +
                    trip.status.slice(1)}
              </span>
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleView(trip)}
                  className="p-2 rounded-md text-blue-400 dark:text-gray-300
                  hover:bg-blue-50 hover:text-blue-600
                  dark:hover:bg-blue-900/40 transition"
                >
                  <EyeIcon />
                </button>

                <button
                  onClick={() => handleEdit(trip)}
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
      })}

      {trips.length === 0 && (
        <tr>
          <td
            colSpan={7}
            className="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            No trips found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

        )}
      </div>
      </div>
    </>
  );
}