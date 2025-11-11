import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker,Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
// ✅ Custom Leaflet Marker Icons
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

const currentIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

type RoutePoint = {
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  dwell_target_seconds?: number;
  sla_arrival_buffer_seconds?: number;
};

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

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
    status: "pending" | "started" | "completed" | "cancelled";
   scheduled_start_time: string; // ✅ Added
  trip_period: "morning" | "afternoon" | "evening"; // ✅ Added
  repeat_days: { // ✅ Added
    Monday: boolean;
    Tuesday: boolean;
    Wednesday: boolean;
    Thursday: boolean;
    Friday: boolean;
    Saturday: boolean;
    Sunday: boolean;
  };
}

// ✅ Locate Me button inside map
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
       L.marker([latitude, longitude], { icon: currentIcon })
  .addTo(map)
  .bindPopup("<b>You are here 🧭</b>")
  .openPopup();

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
      className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 rounded-full shadow-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
      title="Locate Me"
    >
      📍
    </button>
  );
}

// ✅ Map click handler
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
}: {
  routePoints: RoutePoint[];
  setRoutePoints: React.Dispatch<React.SetStateAction<RoutePoint[]>>;
}) => {
  useMapEvents({
    click(e) {
      // Only trigger popup if clicking on map background, not markers or popups
      const target = e.originalEvent.target as HTMLElement;

      // Check if target is map pane or tile layer (empty map area)
      if (target.classList.contains("leaflet-container") || target.tagName === "IMG") {
        const seq = routePoints.length + 1;

        Swal.fire({
          title: `Add Stop ${seq}`,
          html: `
            <input id="swal-stop-name" class="swal2-input" placeholder="Stop Name">
            <input id="swal-dwell" type="number" class="swal2-input" placeholder="Dwell Time (seconds)">
            <input id="swal-sla" type="number" class="swal2-input" placeholder="SLA Arrival Buffer (seconds)">
          `,
          showCancelButton: true,
          confirmButtonText: "Add Stop",
          preConfirm: () => {
            const name = (document.getElementById("swal-stop-name") as HTMLInputElement)?.value;
            const dwell = Number((document.getElementById("swal-dwell") as HTMLInputElement)?.value || 150);
            const sla = Number((document.getElementById("swal-sla") as HTMLInputElement)?.value || 240);

            if (!name) {
              Swal.showValidationMessage("Stop name is required");
              return null;
            }
            return { name, dwell, sla };
          },
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const { name, dwell, sla } = result.value;
            setRoutePoints((prev) => [
              ...prev,
              {
                name,
                latitude: e.latlng.lat,
                longitude: e.latlng.lng,
                sequence: seq,
                dwell_target_seconds: dwell,
                sla_arrival_buffer_seconds: sla,
              },
            ]);
          }
        });
      }
    },
  });
  return null;
};



export default function ManageTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false); 
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<
  { _id: string; vehicle_number: string; vehicle_id: string }[]
>([]);

const [drivers, setDrivers] = useState<
  { _id: string; name: string; driver_id: string }[]
>([]);
console.log("Drivers:", drivers);
  const [selectedDriverMongoId, setSelectedDriverMongoId] = useState("");
const [selectedVehicleMongoId, setSelectedVehicleMongoId] = useState("");


  const [routeName, setRouteName] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
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

useEffect(() => {
  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/vehicles/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.error === false && data.data) {

const vehicleList = data.data.map((v: any) => ({
  _id: v._id,
  vehicle_number: v.vehicle_number,
  vehicle_id: v.vehicle_id, // ✅ store system vehicle ID
}));
setVehicles(vehicleList);
    } else {
        Swal.fire("Error", data.message || "Failed to load vehicles", "error");
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      Swal.fire("Error", "Server error while fetching vehicles", "error");
    }
  };

  fetchVehicles();
}, []);

useEffect(() => {
  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/drivers/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.error === false && data.data) {
        console.log("Fetched Drivers:", data.data);
        // Map only _id and name
const driverList = data.data.map((d: any) => ({
  _id: d._id,
  name: d.name,
  driver_id: d.driver_profile.driver_id,
}));
console.log("Driver List:", driverList);
        setDrivers(driverList);
      } else {
        Swal.fire("Error", data.message || "Failed to load drivers", "error");
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
      Swal.fire("Error", "Server error while fetching drivers", "error");
    }
  };

  fetchDrivers();
}, []);


  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/operator/scheduled-trips/list?page=1&limit=10`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data?.data) setTrips(data.data);
        else Swal.fire("Error", data.message || "Failed to load trips", "error");
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [refresh]);

  // ✅ Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

 const payload = {
  route_name: routeName,
   driver_id: driverId,  
  vehicle_id: vehicleId, 
  scheduled_start_time: scheduledStartTime,
  trip_period: tripPeriod,
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
    route_points: routePoints.map((stop) => ({
    name: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sequence: stop.sequence,
    dwell_target_seconds: stop.dwell_target_seconds || 150,
    sla_arrival_buffer_seconds: stop.sla_arrival_buffer_seconds || 240,
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
  Swal.fire("Success", `Trip ${editingTripId ? "updated" : "created"} successfully`, "success");
  resetForm();
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
  setEditingTripId(null);
};

const handleView = async (trip: Trip) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${BASE_URL}/operator/scheduled-trips/${trip.scheduled_trip_id}/view`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    if (data.error) {
      Swal.fire("Error", data.message || "Failed to fetch trip details", "error");
      return;
    }

    const t = data.data;

    // ✅ Get Driver Name & Vehicle Number
    const driverName =
      drivers.find((d) => d.driver_id === t.driver_id)?.name || "N/A";
    const vehicleNumber =
      vehicles.find((v) => v.vehicle_id === t.vehicle_id)?.vehicle_number || "N/A";

    // ✅ Readable repeat days
    const repeatDaysStr =
      Object.keys(t.repeat_days)
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
        .filter((day) => t.repeat_days[day])
        .join(", ") || "None";

    // ✅ Color-coded status badge
    let statusColor = "#999"; // default gray
    switch (t.status) {
      case "pending":
        statusColor = "#eab308"; // yellow
        break;
      case "started":
        statusColor = "#16a34a"; // green
        break;
      case "completed":
        statusColor = "#2563eb"; // blue
        break;
      case "cancelled":
        statusColor = "#dc2626"; // red
        break;
    }

    const statusBadge = `
      <span style="
        background-color:${statusColor}20;
        color:${statusColor};
        font-weight:bold;
        padding:3px 8px;
        border-radius:6px;
        text-transform:capitalize;
      ">
        ${t.status}
      </span>
    `;

    // ✅ SweetAlert View Popup
    Swal.fire({
      title: `<b>Trip Details</b>`,
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.5;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <p><b>Route Name:</b> ${t.route_name}</p>
            <p><b>Trip Period:</b> ${t.trip_period}</p>
            <p><b>Driver:</b> ${driverName}</p>
            <p><b>Vehicle:</b> ${vehicleNumber}</p>
            <p><b>Start Time:</b> ${t.scheduled_start_time}</p>
            <p><b>Repeat Days:</b> ${repeatDaysStr}</p>
            <p><b>Status:</b> ${statusBadge}</p>
          </div>

          <hr style="margin:10px 0;">

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div>
              <b>Start Location:</b>
              <p>${t.start_location.address}</p>
              <p style="font-size:12px;color:#555;">Lat: ${t.start_location.latitude}, Lng: ${t.start_location.longitude}</p>
            </div>
            <div>
              <b>End Location:</b>
              <p>${t.end_location.address}</p>
              <p style="font-size:12px;color:#555;">Lat: ${t.end_location.latitude}, Lng: ${t.end_location.longitude}</p>
            </div>
          </div>

          <hr style="margin:10px 0;">

          <b>Route Stops:</b>
          <ul style="margin-top:4px; padding-left:18px;">
            ${t.route_points
              .map(
                (stop: any) =>
                  `<li><b>${stop.name}</b> (Lat: ${stop.latitude}, Lng: ${stop.longitude})</li>`
              )
              .join("")}
          </ul>
      `,
      confirmButtonText: "Close",
      width: 550,
    });
  } catch (err) {
    console.error("Error fetching trip:", err);
    Swal.fire("Error", "Server error while fetching trip details", "error");
  }
};





const handleEdit = (trip: Trip) => {
  setRouteName(trip.route_name);
  setDriverId(trip.driver_id);
  setVehicleId(trip.vehicle_id);
  setStartLocation(trip.start_location);
  setEndLocation(trip.end_location);
  setEditingTripId(trip._id);
  setShowForm(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
  setScheduledStartTime(trip.scheduled_start_time || "06:00");
  setTripPeriod(trip.trip_period || "morning");

  // ✅ Only keep weekdays, ignore _id and id
  const cleanRepeatDays: typeof repeatDays = {
    Monday: trip.repeat_days.Monday || false,
    Tuesday: trip.repeat_days.Tuesday || false,
    Wednesday: trip.repeat_days.Wednesday || false,
    Thursday: trip.repeat_days.Thursday || false,
    Friday: trip.repeat_days.Friday || false,
    Saturday: trip.repeat_days.Saturday || false,
    Sunday: trip.repeat_days.Sunday || false,
  };

  setRepeatDays(cleanRepeatDays);
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
      Swal.fire(
        "Success",
        data.message || `Trip ${action}d successfully`,
        "success"
      );
      setRefresh((p) => !p);
    } else {
      Swal.fire("Error", data.message || "Failed to update trip status", "error");
    }
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Server error while updating trip status", "error");
  }
};




  return (
    <>
      <PageMeta title="Manage Trips" description="Manage, create, and update scheduled trips" />
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

            <form onSubmit={handleSubmit} className="space-y-4">
             <div>
  <label className="block mb-1 font-medium">Route Name</label>
  <input
    type="text"
    value={routeName}
    onChange={(e) => setRouteName(e.target.value)}
    className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
  />
</div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
  <label className="block mb-1 font-medium">Driver</label>
 <select
  value={driverId}
  onChange={(e) => setDriverId(e.target.value)}
  className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
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
>
  <option value="">Select Vehicle</option>
  {vehicles.map((v) => (
    <option key={v._id} value={v.vehicle_id}>
      {v.vehicle_number}
    </option>
  ))}
</select>

</div>

              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Scheduled Start Time */}
  <div>
    <label className="block mb-1 font-medium">Scheduled Start Time</label>
    <input
      type="time"
      value={scheduledStartTime}
      onChange={(e) => setScheduledStartTime(e.target.value)}
      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
    />
  </div>

  {/* Trip Period */}
  <div>
    <label className="block mb-1 font-medium">Trip Period</label>
    <select
      value={tripPeriod}
      onChange={(e) => setTripPeriod(e.target.value)}
      className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
    >
      <option value="morning">Morning</option>
      <option value="afternoon">Afternoon</option>
      <option value="evening">Evening</option>
    </select>
  </div>
</div>

{/* Repeat Days */}
<div>
  <label className="block mb-2 font-medium">Repeat Days</label>
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


              {/* Maps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Map */}
                <div className="relative">
                  <label className="block mb-2 font-medium">Start Location</label>
                  <div className="relative h-[300px]">
                    <MapContainer
                      center={[20.5937, 78.9629]}
                      zoom={5}
                      className="h-full w-full rounded border border-gray-300 dark:border-gray-700"
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationMarker setLocation={setStartLocation} />
                      {startLocation.latitude !== 0 && (
                    <Marker
  position={[startLocation.latitude, startLocation.longitude]}
  icon={startIcon}
/>
                      )}
                      <LocateMeButton
                        setCoords={(coords) => setStartLocation({ ...startLocation, ...coords })}
                      />
                    </MapContainer>
                  </div>
                </div>

                {/* End Map */}
                <div className="relative">
                  <label className="block mb-2 font-medium">End Location</label>
                  <div className="relative h-[300px]">
                    <MapContainer
                      center={[20.5937, 78.9629]}
                      zoom={5}
                      className="h-full w-full rounded border border-gray-300 dark:border-gray-700"
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationMarker setLocation={setEndLocation} />
                      {endLocation.latitude !== 0 && (
                   <Marker
  position={[endLocation.latitude, endLocation.longitude]}
  icon={endIcon}
/>
                      )}
                      <LocateMeButton
                        setCoords={(coords) => setEndLocation({ ...endLocation, ...coords })}
                      />
                    </MapContainer>
                  </div>
                </div>
              </div>
{/* Start & End Location Address Inputs */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
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
  </div>
  <div>
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
  </div>
</div>

{/* Stops Map */}
<div className="relative mt-4">
  <label className="block mb-2 font-medium">Add Route Stops</label>
  <div className="relative h-[400px]">
    <MapContainer
      center={[20.5937, 78.9629]} // default center
      zoom={5}
      className="h-full w-full rounded border border-gray-300 dark:border-gray-700"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Add new stops on click */}
      <StopMarker routePoints={routePoints} setRoutePoints={setRoutePoints} />
      
      {/* Show all stops as markers */}
     {routePoints.map((stop) => (
  <Marker key={stop.sequence} position={[stop.latitude, stop.longitude]} icon={startIcon}>
    <Popup>{stop.name}</Popup>
  </Marker>
))}


      {/* Locate Me Button */}
      <LocateMeButton
        setCoords={(coords) => {
          // optional: center map on current location
        }}
      />
    </MapContainer>
  </div>
</div>
{/* Stops List */}
{routePoints.length > 0 && (
  <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
    <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">Added Stops</h4>
    <ul className="space-y-2">
      {routePoints.map((stop, index) => (
        <li
          key={stop.sequence}
          className="flex items-center justify-between bg-white dark:bg-gray-700 px-3 py-2 rounded shadow-sm"
        >
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">{stop.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Lat: {stop.latitude.toFixed(4)}, Lng: {stop.longitude.toFixed(4)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Dwell: {stop.dwell_target_seconds}s, SLA Buffer: {stop.sla_arrival_buffer_seconds}s
            </p>
          </div>
        </li>
      ))}
    </ul>
  </div>
)}


              <div className="flex gap-3">
                <Button type="submit">{editingTripId ? "Update Trip" : "Create Trip"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Trip Table */}
<div className="w-full overflow-x-auto">
  <table className="min-w-full border-collapse">
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-700">
        {[
          "Route Name",
          "Driver Name",
          "Vehicle Number",
          "Repeat Days",
          "Trip Status",
          "Actions",
        ].map((h) => (
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
      {trips.map((trip) => {
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
              (day) => trip.repeat_days[day as keyof typeof trip.repeat_days]
            )
            .join(", ") || "None";

        return (
          <tr
            key={trip._id}
            className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            <td className="px-2 py-2">{trip.route_name}</td>
            <td className="px-2 py-2">
              {drivers.find((d) => d.driver_id === trip.driver_id)?.name ||
                "N/A"}
            </td>
            <td className="px-2 py-2">
              {vehicles.find((v) => v.vehicle_id === trip.vehicle_id)
                ?.vehicle_number || "N/A"}
            </td>
            <td className="px-2 py-2">{repeatDaysStr}</td>
          <td className="px-2 py-2">
  <span
    className={`px-3 py-1 rounded-full text-xs font-medium ${
      trip.status === "pending"
        ? "bg-yellow-100 text-yellow-700"
        : trip.status === "started"
        ? "bg-green-100 text-green-700"
        : trip.status === "completed"
        ? "bg-blue-100 text-blue-700"
        : trip.status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    {trip.status}
  </span>
</td>


            <td className="px-2 py-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(trip)}
                  className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                >
                  View
                </button>
                <button
                  onClick={() => handleEdit(trip)}
                  className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  Edit
                </button>
            {/* <button
  onClick={() => handleActivateDeactivate(trip)}
  className={`text-xs px-3 py-1 rounded ${
    trip.status === "pending" || trip.status === "started"
      ? "bg-red-50 text-red-600 hover:bg-red-100"
      : "bg-green-50 text-green-600 hover:bg-green-100"
  }`}
>
  {trip.status === "pending" || trip.status === "started"
    ? "Deactivate"
    : "Activate"}
</button> */}



              </div>
            </td>
          </tr>
        );
      })}

      {trips.length === 0 && (
        <tr>
          <td
            colSpan={6}
            className="text-center py-6 text-gray-500 dark:text-gray-400"
          >
            No trips found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
      </div>
    </>
  );
}
