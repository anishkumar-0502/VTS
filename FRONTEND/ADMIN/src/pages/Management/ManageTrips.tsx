import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
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
  status: string;
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

export default function ManageTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false); // 👈 toggle create/edit form
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

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
      if (data.success) {
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (data.error) {
      Swal.fire("Error", data.message || "Failed to fetch trip details", "error");
      return;
    }

    const t = data.data;
    const repeatDays = Object.keys(t.repeat_days)
      .filter((d) => t.repeat_days[d] === true)
      .join(", ") || "None";

    Swal.fire({
      title: `<b>Trip Details</b>`,
      html: `
        <div style="text-align:left; font-size:14px">
          <p><b>Scheduled Trip ID:</b> ${t.scheduled_trip_id}</p>
          <p><b>Route Name:</b> ${trip.route_name || "N/A"}</p>
          <p><b>Driver ID:</b> ${t.driver_id}</p>
          <p><b>Vehicle ID:</b> ${t.vehicle_id}</p>
          <p><b>Start Time:</b> ${t.scheduled_start_time}</p>
          <p><b>Trip Period:</b> ${t.trip_period}</p>
          <p><b>Repeat Days:</b> ${repeatDays}</p>
          <p><b>Status:</b> ${t.status}</p>
          <hr style="margin:8px 0;">
          <p><b>Start Location:</b><br>Lat: ${t.start_location.latitude}, Lng: ${t.start_location.longitude}</p>
          <p><b>End Location:</b><br>Lat: ${t.end_location.latitude}, Lng: ${t.end_location.longitude}</p>
        </div>
      `,
      confirmButtonText: "Close",
      width: 500,
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
setRepeatDays(trip.repeat_days || {
  Monday: false,
  Tuesday: false,
  Wednesday: false,
  Thursday: false,
  Friday: false,
  Saturday: false,
  Sunday: false,
});

  };

  const handleActivateDeactivate = async (trip: Trip) => {
    const confirm = await Swal.fire({
      title: trip.status === "active" ? "Deactivate Trip?" : "Activate Trip?",
      text: `Are you sure you want to ${
        trip.status === "active" ? "deactivate" : "activate"
      } this trip?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
    });

    if (!confirm.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/scheduled-trips/${trip._id}/deactivate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire("Success", "Trip status updated", "success");
        setRefresh((p) => !p);
      } else {
        Swal.fire("Error", data.message || "Failed to update", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Server error", "error");
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
                  <label className="block mb-1 font-medium">Driver ID</label>
                  <input
                    type="text"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Vehicle ID</label>
                  <input
                    type="text"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
                  />
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
        <div className="overflow-x-auto">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Route Name</th>
                  <th className="px-4 py-2 text-left">Driver ID</th>
                  <th className="px-4 py-2 text-left">Vehicle ID</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.length > 0 ? (
                  trips.map((trip) => (
                    <tr
                      key={trip._id}
                      className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300"
                    >
                      <td className="px-4 py-2">{trip.route_name}</td>
                      <td className="px-4 py-2">{trip.driver_id}</td>
                      <td className="px-4 py-2">{trip.vehicle_id}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            trip.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                            <button
      onClick={() => handleView(trip)}
      className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800"
    >
      View
    </button>
                          <button
                            onClick={() => handleEdit(trip)}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleActivateDeactivate(trip)}
                            className={`text-xs px-3 py-1 rounded ${
                              trip.status === "active"
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }`}
                          >
                            {trip.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No trips found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
