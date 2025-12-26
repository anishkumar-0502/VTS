import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import PageShimmer from "../../components/common/PageShimmer";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

// --- Interfaces ---

interface EndUser {
  _id: string;
  name: string;
  email: string;
  phone_number: number;
  role_id: number;
  status: boolean;
  operator_id: string;
  assigned_vehicle_id?: string | null;
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
    route_name?: string;
  } | null;
}

interface Driver {
  user_id: string;
  name: string;
  email: string;
  phone_number: number;
  status: boolean;
  assigned_vehicle?: {
    vehicle_number: string;
    route_name: string;
  };
}

// --- Helper Components & Functions ---

function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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
        map.setView([latitude, longitude], 18);
      },
      () => {
        Swal.fire("Error", "Unable to get your current location.", "error");
      }
    );
  };
  return (
    <button
      type="button"
      onClick={handleLocate}
      className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 shadow-md rounded-full p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      title="Locate Me"
    >
      📍
    </button>
  );
}

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
    <path d="M2 12C4.5 7 8 5 12 5s7.5 2 10 7c-2.5 5-6 7-10 7s-7.5-2-10-7Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

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

const normalizePhone = (value: string | number): string => {
  return String(value)
    .replace(/\D/g, "")
    .replace(/^91/, "")
    .slice(-10);
};

// --- Main Component ---

export default function UnifiedUserManagement() {
  const [activeTab, setActiveTab] = useState<"management" | "allUsers">("management");
  const [loading, setLoading] = useState(false);
  const isDark = document.documentElement.classList.contains("dark");

  const swalBaseConfig = {
    background: isDark ? "#1f2937" : "#ffffff",
    color: isDark ? "#e5e7eb" : "#111827",
    confirmButtonColor: isDark ? "#6366f1" : "#4f46e5",
  };

  // --- End User Management States ---
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [editingUser, setEditingUser] = useState<EndUser | null>(null);
  const [mgmtUsers, setMgmtUsers] = useState<EndUser[]>([]);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [mgmtPage, setMgmtPage] = useState(1);
  const [hasMoreMgmt, setHasMoreMgmt] = useState(true);
  const [loadingMoreMgmt, setLoadingMoreMgmt] = useState(false);

  // --- Controlled Form State ---
  const initialFormState = {
    name: "",
    email: "",
    phone_number: "",
    sos_name: "",
    sos_phone: "",
    pickup_name: "",
    dropoff_name: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- All User States ---
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allEndUsers, setAllEndUsers] = useState<EndUser[]>([]);
  const [selectedAllType, setSelectedAllType] = useState<"driver" | "endUser">("driver");
  const [allPage, setAllPage] = useState(1);
  const [totalAllPages, setTotalAllPages] = useState(1);
  const [loadingMoreAll, setLoadingMoreAll] = useState(false);

  const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const defaultCenter = [13.0827, 80.2707];

  // --- Fetch Logics ---

  const fetchManagementUsers = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMoreMgmt(true);

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/end-users/list?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch end users");

      setMgmtUsers((prev) => (pageNum === 1 ? data.data : [...prev, ...data.data]));
      setHasMoreMgmt(data.data.length === 10);
      setMgmtPage(pageNum);
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    } finally {
      setLoading(false);
      setLoadingMoreMgmt(false);
    }
  };

  const fetchAllUsers = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMoreAll(true);

      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/operator/users/list?page=${pageNum}&limit=10&type=all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch users");

      if (pageNum === 1) {
        setDrivers(data.data.drivers || []);
        setAllEndUsers(data.data.end_users || []);
      } else {
        setDrivers((prev) => [...prev, ...(data.data.drivers || [])]);
        setAllEndUsers((prev) => [...prev, ...(data.data.end_users || [])]);
      }
      setTotalAllPages(data.pagination?.totalPages || 1);
      setAllPage(pageNum);
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    } finally {
      setLoading(false);
      setLoadingMoreAll(false);
    }
  };

  useEffect(() => {
    if (activeTab === "management") fetchManagementUsers(1);
    else fetchAllUsers(1);
  }, [activeTab]);

  // --- Actions ---

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!pickupCoords || !dropoffCoords) {
      Swal.fire({ ...swalBaseConfig, icon: "warning", title: "Please select locations on the map!" });
      return;
    }

    const body = {
      name: formData.name,
      email: formData.email,
      phone_number: String(normalizePhone(formData.phone_number)),
      sos_contact: {
        name: formData.sos_name,
        phone_number: String(normalizePhone(formData.sos_phone)),
      },
      pickup_location: {
        latitude: pickupCoords.lat,
        longitude: pickupCoords.lng,
        address: pickupAddress,
        name: formData.pickup_name,
      },
      dropoff_location: {
        latitude: dropoffCoords.lat,
        longitude: dropoffCoords.lng,
        address: dropoffAddress,
        name: formData.dropoff_name,
      },
    };

    try {
      const token = localStorage.getItem("token");
      const url = editingUser
        ? `${BASE_URL}/operator/end-users/${editingUser.user_id}/update`
        : `${BASE_URL}/operator/end-users/create`;
      const res = await fetch(url, {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      showSuccess(editingUser ? "User updated successfully!" : "User created successfully!");
      setShowForm(false);
      setEditingUser(null);
      setFormStep(1);
      setFormData(initialFormState);
      fetchManagementUsers(1);
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  const toggleStatus = async (user_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/end-users/${user_id}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Status updated successfully!");
      fetchManagementUsers(1);
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  const handleView = async (user_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/operator/end-users/${user_id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const u = data.data as EndUser;
      const darkMode = document.documentElement.classList.contains("dark");

      Swal.fire({
        showCloseButton: true,
        showConfirmButton: false,
        width: 700,
        padding: "0",
        background: "transparent",
        html: `
        <div style="border-radius:26px; padding:2px; background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5); box-shadow:0 30px 80px rgba(0,0,0,.45);">
          <div style="background:${darkMode ? "#020617" : "#ffffff"}; border-radius:24px; overflow:hidden; font-family:Inter,system-ui,sans-serif; position:relative; text-align:left;">
            <div style="position:absolute; inset:0; pointer-events:none; background:radial-gradient(600px at top left, rgba(99,102,241,.15), transparent 40%), radial-gradient(500px at bottom right, rgba(34,211,238,.12), transparent 45%);"></div>

            <div style="position:relative; padding:20px 24px; background:linear-gradient(135deg,#4f46e5,#6366f1); display:flex; align-items:center; gap:14px;">
              <div style="width:56px;height:56px;border-radius:16px; background:rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; color:white; box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);">
                ${u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size:20px; font-weight:800; color:white">${u.name}</div>
                <div style="font-size:13px; color:rgba(255,255,255,.85)">End User Profile</div>
              </div>
            </div>

            <div style="position:relative; padding:24px; color:${darkMode ? "#e5e7eb" : "#111827"};">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:14px">
                <div><b>Email:</b> ${u.email}</div>
                <div><b>Phone:</b> ${u.phone_number || "N/A"}</div>
                <div><b>SOS Name:</b> ${u.end_user_profile?.sos_contact?.name || "N/A"}</div>
                <div><b>SOS Phone:</b> ${u.end_user_profile?.sos_contact?.phone_number || "N/A"}</div>
                <div><b>Pickup Label:</b> ${u.end_user_profile?.pickup_location?.name || "N/A"}</div>
                <div>
                  <b>Status:</b>
                  ${u.status 
                    ? `<span style="margin-left:6px; background:#10b98122; color:#10b981; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600">Active</span>`
                    : `<span style="margin-left:6px; background:#ef444422; color:#ef4444; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600">Inactive</span>`
                  }
                </div>
              </div>

              <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:18px 0"/>
              
              <div style="font-size:14px; line-height:1.6; margin-bottom:18px;">
                <div style="margin-bottom:8px;"><b>Pickup Address:</b> <span style="color:${darkMode ? "#9ca3af" : "#4b5563"}">${u.end_user_profile?.pickup_location?.address || "N/A"}</span></div>
                <div><b>Dropoff Address:</b> <span style="color:${darkMode ? "#9ca3af" : "#4b5563"}">${u.end_user_profile?.dropoff_location?.address || "N/A"}</span></div>
              </div>

              <b style="font-size:15px">Assigned Service Details</b>
              <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:14px; border:1px solid ${darkMode ? "#4b5563" : "#ddd"};">
                <thead>
                  <tr style="background:${darkMode ? "#1f2937" : "#f3f4f6"}">
                    <th style="padding:10px; text-align:left">Vehicle No.</th>
                    <th style="padding:10px; text-align:left">Assigned Driver</th>
                  </tr>
                </thead>
                <tbody>
                  ${u.assigned_vehicle ? `
                    <tr>
                      <td style="padding:10px">${u.assigned_vehicle.vehicle_number}</td>
                      <td style="padding:10px">${u.assigned_vehicle.driver?.name || "—"}</td>
                    </tr>
                  ` : `
                    <tr>
                      <td colspan="3" style="padding:14px; text-align:center; color:${darkMode ? "#9ca3af" : "#6b7280"}; font-style:italic;">
                        No vehicle currently assigned
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        `,
        customClass: { popup: "shadow-none" }
      });
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  const renderAllUsersTable = (data: (Driver | EndUser)[], label: string) => (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{label}</h2>
                <div className="h-[70vh] overflow-y-auto overflow-x-auto no-scrollbar">
              <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            <tr className="text-gray-600 dark:text-gray-300">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Vehicle</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((u, idx) => (
                <tr
                  key={u.user_id}
                  className={`border-t dark:border-gray-700 
                  ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"} 
                  hover:bg-blue-50/50 dark:hover:bg-gray-700 transition`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.phone_number}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                      {u.assigned_vehicle?.vehicle_number || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.status ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"}`}>
                      {u.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">No {label.toLowerCase()} found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <PageShimmer />;

  return (
    <>
      <PageMeta title="User Management | Operator" description="Manage all users" />
      <div>
        <PageBreadCrumb pageTitle="User Management" />
        <div className="max-w-6xl mx-auto mb-6 flex gap-4">
          <Button size="sm" variant={activeTab === "management" ? "primary" : "outline"} onClick={() => setActiveTab("management")}>
            End User Management
          </Button>
          <Button size="sm" variant={activeTab === "allUsers" ? "primary" : "outline"} onClick={() => setActiveTab("allUsers")}>
            Driver Management
          </Button>
        </div>

        {activeTab === "management" ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage End Users</h2>
              {!showForm && (
                <Button variant="primary" size="sm" onClick={() => { 
                  setEditingUser(null); 
                  setShowForm(true); 
                  setFormStep(1);
                  setPickupCoords(null); 
                  setDropoffCoords(null); 
                  setPickupAddress(""); 
                  setDropoffAddress(""); 
                  setFormData(initialFormState);
                }}>
                  + Add End User
                </Button>
              )}
            </div>

            {showForm && (
              <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* STEP INDICATOR */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${formStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        {step}
                      </div>
                      {step < 3 && <div className={`w-12 h-0.5 ${formStep > step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* STEP 1: BASIC INFO */}
                  {formStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                      {["name", "email", "phone_number"].map((field) => (
                        <div key={field}>
                          <label className="block text-sm font-medium capitalize text-gray-700 dark:text-gray-300 mb-1">
                            {field.replace("_", " ")}
                          </label>
                          <input 
                            name={field} 
                            type={field === "email" ? "email" : "text"} 
                            value={(formData as any)[field]} 
                            onChange={handleInputChange}
                            required 
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* STEP 2: SOS INFO */}
                  {formStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SOS Contact Name</label>
                        <input 
                          name="sos_name" 
                          type="text" 
                          value={formData.sos_name} 
                          onChange={handleInputChange}
                          required 
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SOS Contact Phone</label>
                        <input 
                          name="sos_phone" 
                          type="text" 
                          value={formData.sos_phone} 
                          onChange={handleInputChange}
                          required 
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 3: LOCATION INFO */}
                  {formStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">📍 Pickup Location</h4>
                          <div className="h-64 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 shadow-inner">
                            <MapContainer center={defaultCenter as any} zoom={13} className="h-full w-full">
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <LocationSelector onSelect={async (lat, lng) => { setPickupCoords({ lat, lng }); setPickupAddress(await getAddressFromLatLng(lat, lng)); }} />
                              {pickupCoords && <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={markerIcon} />}
                              <LocateMeButton setCoords={async ({ lat, lng }) => { setPickupCoords({ lat, lng }); setPickupAddress(await getAddressFromLatLng(lat, lng)); }} />
                            </MapContainer>
                          </div>
                          <div className="mt-3 space-y-2">
                            <input name="pickup_name" placeholder="Pickup Label (e.g. Home)" value={formData.pickup_name} onChange={handleInputChange} required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <input name="pickup_address" type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Auto-fetched Address" />
                          </div>
                        </div>

                        <div className="relative">
                          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">🏁 Dropoff Location</h4>
                          <div className="h-64 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 shadow-inner">
                            <MapContainer center={defaultCenter as any} zoom={13} className="h-full w-full">
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <LocationSelector onSelect={async (lat, lng) => { setDropoffCoords({ lat, lng }); setDropoffAddress(await getAddressFromLatLng(lat, lng)); }} />
                              {dropoffCoords && <Marker position={[dropoffCoords.lat, dropoffCoords.lng]} icon={markerIcon} />}
                              <LocateMeButton setCoords={async ({ lat, lng }) => { setDropoffCoords({ lat, lng }); setDropoffAddress(await getAddressFromLatLng(lat, lng)); }} />
                            </MapContainer>
                          </div>
                          <div className="mt-3 space-y-2">
                            <input name="dropoff_name" placeholder="Dropoff Label (e.g. Office)" value={formData.dropoff_name} onChange={handleInputChange} required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <input name="dropoff_address" type="text" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Auto-fetched Address" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NAVIGATION BUTTONS */}
                  <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" size="sm" type="button" onClick={() => formStep > 1 ? setFormStep(formStep - 1) : setShowForm(false)}>
                      {formStep === 1 ? "Cancel" : "Back"}
                    </Button>
                    <div className="flex gap-3">
                      {formStep < 3 ? (
                        <Button variant="primary" size="sm" type="button" onClick={() => setFormStep(formStep + 1)}>
                          Next Step
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" type="submit">
                          {editingUser ? "Update End User" : "Create End User"}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}

            {!showForm && ( 
                        <div className="h-[70vh] overflow-y-auto overflow-x-auto no-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                    <tr className="text-gray-600 dark:text-gray-300">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Phone</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mgmtUsers.map((u, idx) => (
                      <tr key={u._id} className={`border-t dark:border-gray-700 ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"} hover:bg-blue-50/50 dark:hover:bg-gray-700 transition`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.phone_number}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${u.status ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"}`}>
                            {u.status ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button title="Toggle Status" onClick={() => toggleStatus(u.user_id)} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                              {u.status ? <DeactivateIcon /> : <ActivateIcon />}
                            </button>
                            <button onClick={() => handleView(u.user_id)} className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/40 transition">
                              <EyeIcon />
                            </button>
                            <button 
                              onClick={() => { 
                                setEditingUser(u); 
                                setShowForm(true); 
                                setFormStep(1);
                                setFormData({
                                  name: u.name || "",
                                  email: u.email || "",
                                  phone_number: String(u.phone_number) || "",
                                  sos_name: u.end_user_profile?.sos_contact?.name || "",
                                  sos_phone: String(u.end_user_profile?.sos_contact?.phone_number) || "",
                                  pickup_name: u.end_user_profile?.pickup_location?.name || "",
                                  dropoff_name: u.end_user_profile?.dropoff_location?.name || ""
                                });
                                setPickupCoords({lat: u.end_user_profile?.pickup_location?.latitude || 0, lng: u.end_user_profile?.pickup_location?.longitude || 0}); 
                                setDropoffCoords({lat: u.end_user_profile?.dropoff_location?.latitude || 0, lng: u.end_user_profile?.dropoff_location?.longitude || 0}); 
                                setPickupAddress(u.end_user_profile?.pickup_location?.address || ""); 
                                setDropoffAddress(u.end_user_profile?.dropoff_location?.address || ""); 
                              }} 
                              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 transition"
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasMoreMgmt && (
              <div className="flex justify-center py-4">
                <Button variant="primary" size="sm" disabled={loadingMoreMgmt} onClick={() => fetchManagementUsers(mgmtPage + 1)}>
                  {loadingMoreMgmt ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto">
            {selectedAllType === "driver" ? renderAllUsersTable(drivers, "Drivers") : renderAllUsersTable(allEndUsers, "End Users")}
            {allPage < totalAllPages && (
              <div className="flex justify-center mt-4">
                <button onClick={() => fetchAllUsers(allPage + 1)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" disabled={loadingMoreAll}>
                  {loadingMoreAll ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}