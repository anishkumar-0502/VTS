import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface User {
  user_id: string;
  name: string;
  email: string;
  phone_number: string;
  role_id: number;
  operator_id: string;
  status: boolean;
}

export default function ManageUsers() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<number>(2); // Default: Operator

  // Detect theme dynamically for alerts
  const isDark = document.documentElement.classList.contains("dark");

  const swalBaseConfig = {
    background: isDark ? "#1f2937" : "#ffffff",
    color: isDark ? "#e5e7eb" : "#111827",
    confirmButtonColor: isDark ? "#6366f1" : "#4f46e5",
  };

  // Fetch all users based on selected role
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/superadmin/users/list?role_id=${selectedRole}&status=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.data) setUsers(data.data);
      else throw new Error(data.message || "Failed to fetch users");
    } catch (err: any) {
      Swal.fire({
        ...swalBaseConfig,
        icon: "error",
        title: "Error",
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  // Create / Update
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone_number: formData.get("phone_number") as string,
      operator_id: formData.get("operator_id") as string,
      role_id: Number(formData.get("role_id")),
    };

    try {
      const token = localStorage.getItem("token");
      const url = editingUser
        ? `${BASE_URL}/superadmin/users/${editingUser.user_id}/update`
        : `${BASE_URL}/superadmin/users/create`;
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
        title: editingUser ? "User updated successfully!" : "User created successfully!",
      });

      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  // Toggle status
  const toggleStatus = async (user_id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/users/${user_id}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire({
        ...swalBaseConfig,
        icon: "success",
        title: "User status updated successfully!",
      });
      fetchUsers();
    } catch (err: any) {
      Swal.fire({ ...swalBaseConfig, icon: "error", title: "Error", text: err.message });
    }
  };

  // View user details
const handleView = async (user_id: string) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/users/${user_id}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const u = data.data;

    const darkMode = document.documentElement.classList.contains("dark");

    const getRoleName = (roleId: number) => {
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

    Swal.fire({
      background: darkMode ? "#1f2937" : "#ffffff",
      color: darkMode ? "#e5e7eb" : "#111827",
      title: `<h3 style="font-size:16px; font-weight:600; margin-bottom:8px;">User Details</h3>`,
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6;">
          <p><b>Name:</b> ${u.name}</p>
          <p><b>Email:</b> ${u.email}</p>
          <p><b>Phone:</b> ${u.phone_number}</p>
          <p><b>Role:</b> ${getRoleName(u.role_id)}</p>
          <p><b>Status:</b> ${
            u.status
              ? '<span style="color:#10b981;font-weight:600;">Active</span>'
              : '<span style="color:#ef4444;font-weight:600;">Inactive</span>'
          }</p>
          <hr style="margin:10px 0;border:none;border-top:1px solid ${
            darkMode ? "#374151" : "#e5e7eb"
          };">
          <p><b>Created:</b> ${new Date(u.createdAt).toLocaleString()}</p>
          <p><b>Updated:</b> ${new Date(u.updatedAt).toLocaleString()}</p>
          <p><b>Last Login:</b> ${u.last_login ? new Date(u.last_login).toLocaleString() : "N/A"}</p>
        </div>
      `,
      confirmButtonText: "Close",
      confirmButtonColor: darkMode ? "#6366f1" : "#4f46e5",
      width: 420,
      customClass: { popup: "rounded-xl shadow-lg" },
    });
  } catch (err: any) {
    Swal.fire({ icon: "error", title: "Error", text: err.message });
  }
};


  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading users...</p>
      </div>
    );

  return (
    <>
      <PageMeta title="User Management | Superadmin" description="Manage all users" />
      <div>
        <PageBreadCrumb pageTitle="User Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Users
            </h2>

            {/* Role filter dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(Number(e.target.value))}
                className="border rounded-lg px-3 py-1.5 dark:bg-gray-800 dark:text-white"
              >
                <option value={1}>Superadmin</option>
                <option value={2}>Operator</option>
                <option value={3}>Driver</option>
                <option value={4}>Gardien</option>
              </select>
              {/* <Button
                size="sm"
                onClick={() => {
                  setEditingUser(null);
                  setShowForm(true);
                }}
              >
                + Add User
              </Button> */}
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["name", "email", "phone_number", "operator_id"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {field.replace("_", " ")}
                    </label>
                    <input
                      name={field}
                      type={field === "email" ? "email" : "text"}
                      defaultValue={(editingUser as any)?.[field] || ""}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}

                {/* Role dropdown in form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select
                    name="role_id"
                    defaultValue={(editingUser?.role_id || 2).toString()}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Superadmin</option>
                    <option value={2}>Operator</option>
                    <option value={3}>Driver</option>
                    <option value={4}>Gardien</option>
                  </select>
                </div>

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
                    {editingUser ? "Update User" : "Create User"}
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
                      key={u.user_id}
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
                          <button
                            onClick={() => toggleStatus(u.user_id)}
                            className={`text-xs px-3 py-1 rounded font-medium transition ${
                              u.status
                                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                            }`}
                          >
                            {u.status ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-6 text-gray-500 dark:text-gray-400"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
