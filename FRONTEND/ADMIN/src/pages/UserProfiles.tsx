import { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { Mail, Phone, Shield, Clock, Calendar, Activity } from "lucide-react";
import { Pencil } from "lucide-react";
import Swal from "sweetalert2";


const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface ProfileData {
  name: string;
  email: string;
  phone_number: string;
  role_id: number;
  createdAt?: string;
  updatedAt?: string;
  last_login?: string;
  status?: boolean;
}

export default function UserProfiles() {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone_number: "",
    role_id: 0,
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
const editSectionRef = useRef<HTMLFormElement | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const getRoleName = (roleId: number): string => {
    switch (roleId) {
      case 1:
        return "Super Admin";
      case 2:
        return "Operator";
      case 3:
        return "Driver";
      case 4:
        return "Parent/Guardian";
      default:
        return "Unknown";
    }
  };

 useEffect(() => {
  const init = async () => {
    setLoading(true);
    try {
      await fetchProfile();
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  init(); // call immediately on mount
}, []);

useEffect(() => {
  if (editMode && editSectionRef.current) {
    editSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, [editMode]);


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

  const getRoleInfo = () => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const role = user?.role?.toLowerCase() || "superadmin";
    return role;
  };

  const fetchProfile = async () => {
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) return setError("No token found. Please log in again.");

      const role = getRoleInfo();
      const endpoint =
        role === "operator"
          ? `${API_BASE_URL}/operator/profile`
          : `${API_BASE_URL}/superadmin/profile`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.error) {
        setError(data.message || "Failed to fetch profile");
      } else {
        const p = data.data || {};
        setProfileData({
          name: p.name || p.full_name || "",
          email: p.email || "",
          phone_number: p.phone_number?.toString() || "",
          role_id: p.role_id || 0,
          createdAt: p.createdAt || "",
          updatedAt: p.updatedAt || "",
          last_login: p.last_login || "",
          status: p.status ?? false,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching profile");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!profileData.name.trim()) return setError("Name is required");

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const role = getRoleInfo();

      const endpoint =
        role === "operator"
          ? `${API_BASE_URL}/operator/profile/update`
          : `${API_BASE_URL}/superadmin/profile/update`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileData.name,
          phone_number: profileData.phone_number,
        }),
      });

      const data = await res.json();

     if (!data.error) {
      showSuccess("Profile updated successfully");
      setEditMode(false);
      fetchProfile();
    } else {
      setError(data.message || "Failed to update profile");
    }
  } catch {
    setError("An error occurred while updating profile");
  } finally {
    setLoading(false);
  }
};

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwords.current) return setError("Current password is required");
    if (!passwords.new) return setError("New password is required");
    if (passwords.new.length < 6)
      return setError("New password must be at least 6 characters");
    if (passwords.new !== passwords.confirm)
      return setError("Passwords do not match");

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const role = getRoleInfo();

      const endpoint =
        role === "operator"
          ? `${API_BASE_URL}/operator/change-password`
          : `${API_BASE_URL}/superadmin/change-password`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await res.json();

      if (!data.error) {
  showSuccess("Password changed successfully");
  setPasswords({ current: "", new: "", confirm: "" });
  setPasswordMode(false);
}
 else {
        setError(data.message || "Failed to change password");
      }
    } catch {
      setError("Error changing password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="User Profile | VTS Admin" description="View and edit your profile" />
      <PageBreadcrumb pageTitle="Profile" />

      <div className="space-y-8">
        {/* Profile Info Section */}
        <div className="relative overflow-hidden  bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-8 shadow-lg">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-4xl font-semibold shadow-md">
    {profileData.name ? profileData.name.charAt(0).toUpperCase() : "U"}
  </div>

  {/* Pencil Icon on Avatar */}
  <button
    onClick={() => setEditMode(true)}
    className="absolute bottom-1 right-1 p-2 rounded-full bg-white dark:bg-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition"
  >
    <Pencil size={16} className="text-blue-600 dark:text-blue-300" />
  </button>
</div>

            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              {profileData.name || "User Name"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {getRoleName(profileData.role_id)}
            </p>
            <div className="mt-2 text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
              {profileData.status ? "Active" : "Inactive"}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { label: "Email", value: profileData.email, icon: Mail },
              { label: "Phone", value: profileData.phone_number || "N/A", icon: Phone },
              { label: "Role", value: getRoleName(profileData.role_id), icon: Shield },
              { label: "Updated At", value: profileData.updatedAt, icon: Activity },
              { label: "Last Login", value: profileData.last_login, icon: Clock },
              {
  label: "Status",
  value: (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        profileData.status
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {profileData.status ? "Active" : "Inactive"}
    </span>
  ),
  icon: Activity,
},

            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-300">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {label}
                  </p>
                 <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
  {value
    ? ["Updated At", "Last Login"].includes(label) && typeof value === "string"
      ? new Date(value).toLocaleString()
      : value
    : "N/A"}
</p>

                </div>
              </div>
            ))}
          </div>

          {/* <div className="mt-8 flex justify-center">
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
            >
              {editMode ? "Cancel Edit" : "Edit Profile"}
            </button>
          </div> */}

        {editMode && (
  <form
    ref={editSectionRef}
    onSubmit={handleProfileUpdate}
    className="mt-8 space-y-5"
  >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={profileData.email} disabled />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={profileData.phone_number}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        phone_number: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Change Password */}
        <div className=" bg-white dark:bg-gray-900 p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Change Password
            </h2>
            <button
              onClick={() => setPasswordMode(!passwordMode)}
              className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
            >
              {passwordMode ? "Cancel" : "Change"}
            </button>
          </div>

          {passwordMode ? (
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {["current", "new", "confirm"].map((field) => (
                <div key={field}>
                  <Label>
                    {field === "current"
                      ? "Current Password *"
                      : field === "new"
                      ? "New Password *"
                      : "Confirm Password *"}
                  </Label>
                  <div className="relative">
                    <Input
                      type={
                        showPasswords[field as keyof typeof showPasswords]
                          ? "text"
                          : "password"
                      }
                      placeholder={
                        field === "current"
                          ? "Enter current password"
                          : field === "new"
                          ? "Enter new password"
                          : "Confirm new password"
                      }
                      value={passwords[field as keyof typeof passwords]}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          [field]: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          [field]: !showPasswords[
                            field as keyof typeof showPasswords
                          ],
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPasswords[field as keyof typeof showPasswords]
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Updating..." : "Update Password"}
                </Button>
                <button
                  type="button"
                  onClick={() => setPasswordMode(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click “Change” to update your password securely.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
