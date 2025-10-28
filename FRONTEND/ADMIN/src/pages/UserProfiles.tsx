import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";

export default function UserProfiles() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
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
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phone: "",
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!profileData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await profileAPI.updateProfile({
        name: profileData.name,
        phone: profileData.phone,
      });

      if (response.success) {
        setSuccess("Profile updated successfully");
        setEditMode(false);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response.message || "Failed to update profile");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwords.current) {
      setError("Current password is required");
      return;
    }
    if (!passwords.new) {
      setError("New password is required");
      return;
    }
    if (passwords.new.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await profileAPI.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });

      if (response.success) {
        setSuccess("Password changed successfully");
        setPasswords({ current: "", new: "", confirm: "" });
        setPasswordMode(false);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response.message || "Failed to change password");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="User Profile | VTS Admin"
        description="View and edit your profile"
      />
      <PageBreadcrumb pageTitle="Profile" />
      
      <div className="space-y-6">
        {/* Profile Information Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Profile Information
            </h2>
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {!editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {profileData.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {profileData.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {profileData.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Role</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white mt-1 capitalize">
                    {user?.role || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label>Full Name <span className="text-error-500">*</span></Label>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div>
                <Label>Email <span className="text-error-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={profileData.email}
                  disabled={true}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  placeholder="Your phone number"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 transition rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Change Password Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Change Password
            </h2>
            <button
              onClick={() => setPasswordMode(!passwordMode)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
            >
              {passwordMode ? "Cancel" : "Change"}
            </button>
          </div>

          {passwordMode && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label>Current Password <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    placeholder="Enter current password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPasswords.current ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <Label>New Password <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    placeholder="Enter new password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPasswords.new ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <Label>Confirm Password <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPasswords.confirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Updating..." : "Update Password"}
                </Button>
                <button
                  type="button"
                  onClick={() => setPasswordMode(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 transition rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!passwordMode && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click "Change" to update your password. Make sure to use a strong password.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
