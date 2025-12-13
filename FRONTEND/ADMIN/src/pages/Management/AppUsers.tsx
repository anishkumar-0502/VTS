import { useState, useEffect } from "react";
import { appUsersAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

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

interface AppUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  imei: string;
  gps_device_id: string;
  status: boolean;
  last_login?: string;
  createdAt: string;
}

export default function AppUsers() {
  const { user } = useAuth();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchAppUsers();
  }, []);

  const fetchAppUsers = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const response = await appUsersAPI.getOperatorUsers(user.id);
      if (response.success && response.data?.users) {
        setAppUsers(response.data.users);
      } else {
        setError(response.message || "Failed to fetch app users");
      }
    } catch (err) {
      setError("Error fetching app users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "deactivate" : "activate";
    if (window.confirm(`Are you sure you want to ${action} this app user?`)) {
      try {
        const response = currentStatus
          ? await appUsersAPI.deactivate(userId)
          : await appUsersAPI.activate(userId);

        if (response.success) {
          setAppUsers(
            appUsers.map((u) =>
              u._id === userId ? { ...u, status: !currentStatus } : u
            )
          );
        } else {
          setError(response.message || `Failed to ${action} user`);
        }
      } catch (err) {
        setError(`Error ${action}ing user`);
      }
    }
  };

  const handleViewDetails = async (userId: string) => {
    try {
      const response = await appUsersAPI.getProfile(userId);
      if (response.success) {
        setSelectedUser(response.data);
        setShowDetails(true);
      } else {
        setError(response.message || "Failed to fetch user details");
      }
    } catch (err) {
      setError("Error fetching user details");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading app users...</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Manage App Users | VTS Admin"
        description="Manage mobile app users"
      />
      <div>
        <PageBreadCrumb pageTitle="App Users" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage App Users
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              View and manage mobile app users registered with your GPS devices
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    IMEI
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {appUsers.map((appUser) => (
                  <tr key={appUser._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">
                      {appUser.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {appUser.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {appUser.phone || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {appUser.imei}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          appUser.status
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {appUser.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {appUser.last_login
                        ? new Date(appUser.last_login).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(appUser._id)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleToggleStatus(appUser._id, appUser.status)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          title={appUser.status ? "Deactivate User" : "Activate User"}
                        >
                          {appUser.status ? <DeactivateIcon /> : <ActivateIcon />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {appUsers.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">
              No app users found
            </div>
          )}
        </div>

        {showDetails && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-dark rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                User Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.phone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">IMEI</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {selectedUser.imei}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Registered</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => setShowDetails(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
