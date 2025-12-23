import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import PageShimmer from "../../components/common/PageShimmer";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface EndUser {
  _id: string;
  name: string;
  email: string;
  phone_number: number;
  role_id: number;
  status: boolean;
  operator_id: string;
  assigned_vehicle_id?: string | null;

  // ⭐ ADD THESE
  user_id: string; 
  end_user_reference?: string;
  end_user_profile?: {
    sos_contact?: {
      name: string;
      phone_number: number;
    };
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

  assigned_vehicle?: {
    vehicle_number: string;
    driver?: {
      name: string;
    };
  } | null;
}


// Custom hook for selecting location on map
function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// 🔁 Reverse Geocoding (LatLng → Address)
async function getAddressFromLatLng(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data.display_name || "Address not found";
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return "Unable to fetch address";
  }
}

// ✅ Locate Me Button Component
function LocateMeButton({ setCoords }: { setCoords: (coords: { lat: number; lng: number }) => void }) {
  const map = useMap();

  const handleLocate = () => {
    if (!navigator.geolocation) {
      Swal.fire("Error", "Geolocation is not supported by your browser.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        // Move map and zoom into building level
        map.setView([latitude, longitude], 18);

        // Add marker + popup
        // L.marker([latitude, longitude])
        //   .addTo(map)
        //   .bindPopup("<b>You are here 🏠</b>")
        //   .openPopup();
      },
      (err) => {
        Swal.fire("Error", "Unable to get your current location.", "error");
        console.error(err);
      }
    );
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 shadow-md rounded-full p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      title="Locate Me"
    >
      📍
    </button>
  );
}

export default function ManageEndUsers() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<EndUser | null>(null);
  const [users, setUsers] = useState<EndUser[]>([]);
  const [loading, setLoading] = useState(false);

  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
const [dropoffAddress, setDropoffAddress] = useState("");

const [page, setPage] = useState(1);
const [pageSize] = useState(10);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

const normalizePhone = (value: string | number): string => {
  return String(value)
    .replace(/\D/g, "") // remove non-numeric characters
    .replace(/^91/, "") // remove 91 if typed without +
    .slice(-10); // keep last 10 digits
};


  const isDark = document.documentElement.classList.contains("dark");
  const swalBaseConfig = {
    background: isDark ? "#1f2937" : "#ffffff",
    color: isDark ? "#e5e7eb" : "#111827",
    confirmButtonColor: isDark ? "#6366f1" : "#4f46e5",
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
  // Fetch End Users
 const fetchUsers = async (pageNum = 1) => {
  try {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/operator/end-users/list?page=${pageNum}&limit=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch end users");

    // Append for lazy loading (not overwrite)
    setUsers(prev => pageNum === 1 ? data.data : [...prev, ...data.data]);

    // Set pagination control
    setHasMore(data.data.length === pageSize);
    setPage(pageNum);
  } catch (err: any) {
    Swal.fire({
      ...swalBaseConfig,
      icon: "error",
      title: "Error",
      text: err.message,
    });
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
};

  useEffect(() => {
    fetchUsers(1);
  }, []);

  // Create / Update End User
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!pickupCoords || !dropoffCoords) {
      Swal.fire({
        ...swalBaseConfig,
        icon: "warning",
        title: "Please select pickup and dropoff locations on the map!",
      });
      return;
    }

    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone_number: String(normalizePhone(formData.get("phone_number") as string)),
      sos_contact: {
        name: formData.get("sos_name") as string,
        phone_number: String(normalizePhone(formData.get("sos_phone") as string)),
      },
      pickup_location: {
        latitude: pickupCoords.lat,
        longitude: pickupCoords.lng,
        // address: formData.get("pickup_address") as string,
        address: pickupAddress,

        name: formData.get("pickup_name") as string,
      },
      dropoff_location: {
        latitude: dropoffCoords.lat,
        longitude: dropoffCoords.lng,
        // address: formData.get("dropoff_address") as string,
        address: dropoffAddress,

        name: formData.get("dropoff_name") as string,
      },
    };

    try {
      const token = localStorage.getItem("token");
      const url = editingUser
        ? `${BASE_URL}/operator/end-users/${editingUser.user_id}/update`
        : `${BASE_URL}/operator/end-users/create`;
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        ...swalBaseConfig,
        icon: "success",
        title: editingUser ? "End User updated successfully!" : "End User created successfully!",
      });

      setShowForm(false);
      setEditingUser(null);
      setPickupCoords(null);
      setDropoffCoords(null);
      fetchUsers();
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  // Toggle activate/deactivate
  const toggleStatus = async (operator_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/end-users/${operator_id}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        ...swalBaseConfig,
        icon: "success",
        title: "End User status updated successfully!",
      });
      fetchUsers();
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  // View user details
const handleView = async (user_id: string) => {
  console.log("Viewing ID:", user_id);

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/operator/end-users/${user_id}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const u = data.data;

    const darkMode = document.documentElement.classList.contains("dark");

    // Helper for displaying label + value rows
    const infoRow = (
      label: string,
      value: string | number | null | undefined
    ): string => {
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
      padding: "20px",
      html: `
        <div style="text-align:left;">

          <!-- Header -->
          <div style="display:flex; align-items:center; gap:15px; padding-bottom:15px;">
            <div style="
              width:55px; height:55px; border-radius:50%;
              background:#4f46e533; display:flex;
              align-items:center; justify-content:center;
              font-size:22px; font-weight:700; color:#4f46e5;">
              ${u.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:20px; font-weight:700; color:${darkMode ? "#e5e7eb" : "#111827"};">
                ${u.name}
              </div>
              <div style="font-size:13px; color:${darkMode ? "#9ca3af" : "#6b7280"};">
                End User
              </div>
            </div>
          </div>

          <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:12px 0;" />

          <!-- Account Info -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${infoRow("Email", u.email)}
            ${infoRow("Phone", u.phone_number)}
            <div style="
              font-size:14px;
              font-weight:500;
              padding:4px 0;
              color:${darkMode ? "#e5e7eb" : "#111827"};">
              <b>Status :</b> ${
                u.status
                  ? `<span style="background:#10b98122; color:#10b981; padding:3px 8px; border-radius:6px; font-size:12px;">Active</span>`
                  : `<span style="background:#ef444422; color:#ef4444; padding:3px 8px; border-radius:6px; font-size:12px;">Inactive</span>`
              }
            </div>
          </div>

          <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:14px 0;" />

          <!-- SOS & Pickup/Dropoff -->
          <div style="margin-bottom:10px;">
            <div style="font-size:14px; font-weight:600; margin-bottom:8px;">Contact & Location</div>
            ${infoRow("SOS Contact", `${u.end_user_profile?.sos_contact?.name || "-"} (${u.end_user_profile?.sos_contact?.phone_number || "-"})`)}
            ${infoRow("Pickup", `${u.end_user_profile?.pickup_location?.address || "-"} (${u.end_user_profile?.pickup_location?.name || "-"})`)}
            ${infoRow("Dropoff", `${u.end_user_profile?.dropoff_location?.address || "-"} (${u.end_user_profile?.dropoff_location?.name || "-"})`)}
          </div>

          <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:14px 0;" />

          <!-- Vehicle Info -->
          <div style="margin-bottom:10px;">
            <div style="font-size:14px; font-weight:600; margin-bottom:8px;">Assigned Vehicle</div>
            ${infoRow("Vehicle", u.assigned_vehicle?.vehicle_number)}
            ${infoRow("Driver", u.assigned_vehicle?.driver?.name)}
          </div>

        </div>
      `,
      customClass: { popup: "card-popup" },
    });
  } catch (err: any) {
    Swal.fire({ icon: "error", title: "Error", text: err.message });
  }
};


if (loading)
  return (
    <PageShimmer />
  );


  const defaultCenter = [13.0827, 80.2707]; // Chennai

  const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  return (
    <>
      <PageMeta title="Manage End Users | Operator" description="Manage end users" />
      <div>
        <PageBreadCrumb pageTitle="End User Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage End Users
            </h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingUser(null);
                setShowForm(true);
                setPickupCoords(null);
                setDropoffCoords(null);
              }}
            >
              + Add End User
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingUser ? "Edit End User" : "Add New End User"}
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["name", "email", "phone_number"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {field.replace("_", " ")}
                    </label>
                    <input
                      name={field}
                      type={field === "email" ? "email" : "text"}
                      defaultValue={(editingUser as any)?.[field] || ""}
                      required={field !== "email"}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}

                {/* SOS Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SOS Name
                  </label>
                  <input
                    name="sos_name"
                    type="text"
                    defaultValue={editingUser?.end_user_profile?.sos_contact?.name || ""}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SOS Phone
                  </label>
                  <input
                    name="sos_phone"
                    type="text"
                    defaultValue={editingUser?.end_user_profile?.sos_contact?.phone_number || ""}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Pickup Map */}
                  <div className="relative">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Select Pickup Location
                  </h4>
                  <div className="h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 relative">
                    <MapContainer center={defaultCenter as any} zoom={13} className="h-full w-full">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OSM'
                      />
                      {/* <LocationSelector onSelect={(lat, lng) => setPickupCoords({ lat, lng })} /> */}
                      <LocationSelector
  onSelect={async (lat, lng) => {
    setPickupCoords({ lat, lng });
    const address = await getAddressFromLatLng(lat, lng);
    setPickupAddress(address);
  }}
/>

                      {pickupCoords && <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={markerIcon} />}
                      {/* <LocateMeButton setCoords={setPickupCoords} /> */}
                      <LocateMeButton
  setCoords={async ({ lat, lng }) => {
    setPickupCoords({ lat, lng });
    const address = await getAddressFromLatLng(lat, lng);
    setPickupAddress(address);
  }}
/>

                    </MapContainer>
                  </div>
                  {/* {pickupCoords && (
                    <p className="text-sm text-gray-500 mt-2">
                      Selected: {pickupCoords.lat.toFixed(5)}, {pickupCoords.lng.toFixed(5)}
                    </p>
                  )} */}
                  {pickupAddress && (
  <p className="text-sm text-gray-600 mt-2">
    📍 {pickupAddress}
  </p>
)}

                </div>


                {/* Dropoff Map */}
                <div className="relative">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Select Dropoff Location
                  </h4>
                  <div className="h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 relative">
                    <MapContainer center={defaultCenter as any} zoom={13} className="h-full w-full">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OSM'
                      />
                      {/* <LocationSelector onSelect={(lat, lng) => setDropoffCoords({ lat, lng })} /> */}
                      <LocationSelector
  onSelect={async (lat, lng) => {
    setDropoffCoords({ lat, lng });
    const address = await getAddressFromLatLng(lat, lng);
    setDropoffAddress(address);
  }}
/>

                      {dropoffCoords && <Marker position={[dropoffCoords.lat, dropoffCoords.lng]} icon={markerIcon} />}
                      {/* <LocateMeButton setCoords={setDropoffCoords} /> */}
                      <LocateMeButton
  setCoords={async ({ lat, lng }) => {
    setDropoffCoords({ lat, lng });
    const address = await getAddressFromLatLng(lat, lng);
    setDropoffAddress(address);
  }}
/>

                    </MapContainer>
                  </div>
                  {/* {dropoffCoords && (
                    <p className="text-sm text-gray-500 mt-2">
                      Selected: {dropoffCoords.lat.toFixed(5)}, {dropoffCoords.lng.toFixed(5)}
                    </p>
                  )} */}
                  {dropoffAddress && (
  <p className="text-sm text-gray-600 mt-2">
    📍 {dropoffAddress}
  </p>
)}

                </div>
                </div>
                {/* Pickup/Dropoff Details */}
                {["pickup_name", "pickup_address", "dropoff_name", "dropoff_address"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {field.replace("_", " ")}
                    </label>
                    <input
                      name={field}
                      type="text"
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ))}

                <div className="col-span-full flex justify-end gap-3 mt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button size="sm" type="submit">
                    {editingUser ? "Update End User" : "Create End User"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {["Name", "Email", "Phone", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr
                      key={u._id}
                      className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.phone_number}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            u.status
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {u.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                           <button
                    title={u.status ? "Deactivate User" : "Activate User"}
                    onClick={() => toggleStatus(u.user_id)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {u.status ? <DeactivateIcon /> : <ActivateIcon />}
                  </button>
                          <button
                            onClick={() => handleView(u.user_id)}
                            className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setShowForm(true);
                            }}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No end users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasMore && (
  <div className="flex justify-center py-4">
    <Button
      size="sm"
      disabled={loadingMore}
      onClick={() => fetchUsers(page + 1)}
    >
      {loadingMore ? "Loading..." : "Load More"}
    </Button>
  </div>
)}

        </div>
      </div>
    </>
  );
}
