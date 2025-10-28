import { useState, useEffect } from "react";
import { superadminAppUsersAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

interface AppUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  imei: string;
  gps_device_id: string;
  operator_id: string;
  operator_name: string;
  status: boolean;
  last_login?: string;
  createdAt: string;
}

export default function SuperadminAppUsers() {
  const { user } = useAuth();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAppUsers();
  }, [statusFilter, offset]);

  const fetchAppUsers = async () => {
    try {
      setLoading(true);
      const response = await superadminAppUsersAPI.getAll(
        statusFilter || undefined,
        limit,
        offset
      );
      if (response.success && response.data?.users) {
        setAppUsers(response.data.users);
        setTotal(response.data.total);
      } else {
        setError(response.message || "Failed to fetch app users");
      }
    } catch (err) {
      setError("Error fetching app users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (window.confirm("Are you sure you want to deactivate this app user?")) {
      try {
        const response = await superadminAppUsersAPI.deactivate(userId);
        if (response.success) {
          setAppUsers(
            appUsers.map((u) =>
              u._id === userId ? { ...u, status: false } : u
            )
          );
          if (selectedUser?._id === userId) {
            setSelectedUser({ ...selectedUser, status: false });
          }
        } else {
          setError(response.message || "Failed to deactivate user");
        }
      } catch (err) {
        setError("Error deactivating user");
      }
    }
  };

  const handleViewDetails = (appUser: AppUser) => {
    setSelectedUser(appUser);
    setShowDetails(true);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

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
        title="Manage All App Users | VTS Admin"
        description="Superadmin: Manage all mobile app users"
      />
      <div>
        <PageBreadCrumb pageTitle="App Users Management" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              All App Users
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              View and manage all mobile app users across all operators
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="mb-4 flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | "true" | "false");
                setOffset(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

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
                    Operator
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
                      {appUser.operator_name}
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
                          onClick={() => handleViewDetails(appUser)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                        >
                          View
                        </button>
                        {appUser.status && (
                          <button
                            onClick={() => handleDeactivate(appUser._id)}
                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                          >
                            Deactivate
                          </button>
                        )}
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

          {totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages} (Total: {total} users)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    if ((offset + limit) < total) {
                      setOffset(offset + limit);
                    }
                  }}
                  disabled={(offset + limit) >= total}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">Operator</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.operator_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">IMEI</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {selectedUser.imei}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
                  <p className="text-sm font-medium">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        selectedUser.status
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {selectedUser.status ? "Active" : "Inactive"}
                    </span>
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
                {selectedUser.status && (
                  <button
                    onClick={() => {
                      handleDeactivate(selectedUser._id);
                      setShowDetails(false);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
