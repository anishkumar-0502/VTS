import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.39:8787";

interface Permissions {
  manage_users: boolean;
  view_devices: boolean;
  manage_devices: boolean;
  view_telemetry: boolean;
  view_analytics: boolean;
  manage_notifications: boolean;
  view_dashboard: boolean;
  manage_roles: boolean;
  manage_alerts: boolean;
}

interface Role {
  id?: string;
  role_id?: number;
  role_name: string;
  description: string;
  permissions: Permissions;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const defaultPermissions: Permissions = {
  manage_users: false,
  view_devices: false,
  manage_devices: false,
  view_telemetry: false,
  view_analytics: false,
  manage_notifications: false,
  view_dashboard: false,
  manage_roles: false,
  manage_alerts: false,
};

export default function ManageRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<Role>({
    role_name: "",
    description: "",
    permissions: { ...defaultPermissions },
  });

  /** Fetch all roles */
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/superadmin/roles/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch roles");

      if (data.data && Array.isArray(data.data)) {
        setRoles(
          data.data.map((r: any) => ({
            ...r,
            permissions: r.permissions || {},
          }))
        );
      }
    } catch (err) {
      console.error("Fetch roles error:", err);
      setError("Failed to fetch roles. Please check your network or token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /** Open create form */
  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      role_name: "",
      description: "",
      permissions: { ...defaultPermissions },
    });
    setShowForm(true);
  };

  /** Open edit form */
  const handleEdit = async (role: Role) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/superadmin/roles/${role.role_id || role.id}/view`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch role details");

      const roleDetails = data.data;
      setEditingRole(roleDetails);
      setFormData({
        role_name: roleDetails.role_name,
        description: roleDetails.description,
        permissions: roleDetails.permissions || { ...defaultPermissions },
      });
      setShowForm(true);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load role details.", "error");
    }
  };

  /** Permission toggle */
  const handlePermissionChange = (key: keyof Permissions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  /** Create or update role */
  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!formData.role_name.trim()) {
      Swal.fire("Validation", "Role name is required", "warning");
      return;
    }

    try {
      let url = `${BASE_URL}/superadmin/roles/create`;
      let method = "POST";

      if (editingRole && (editingRole.role_id || editingRole.id)) {
        url = `${BASE_URL}/superadmin/roles/${editingRole.role_id || editingRole.id}/update`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Status ${res.status}`);

      Swal.fire(
        "Success",
        editingRole ? "Role updated successfully!" : "Role created successfully!",
        "success"
      );

      setShowForm(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save role.", "error");
    }
  };

  /** Delete role */
  const handleDelete = async (role: Role) => {
    const token = localStorage.getItem("token");
    if (!role.role_id && !role.id) return;

    const confirm = await Swal.fire({
      title: "Delete Role?",
      text: role.role_name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(
        `${BASE_URL}/superadmin/roles/${role.role_id || role.id}/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Status ${res.status}`);

      Swal.fire("Deleted", "Role deleted successfully.", "success");
      fetchRoles();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to delete role.", "error");
    }
  };

  /** View role details (fetch full from backend) */
  const handleView = async (role: Role) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/superadmin/roles/${role.role_id || role.id}/view`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch role details");

      const roleDetails = data.data;

      Swal.fire({
        title: `<strong>${roleDetails.role_name}</strong>`,
        html: `
          <div style="text-align:left; line-height:1.6;">
            <p><b>Description:</b> ${roleDetails.description || "-"}</p>
            <p><b>Status:</b> ${roleDetails.status ? "Active" : "Inactive"}</p>
            <p><b>Created At:</b> ${new Date(roleDetails.createdAt).toLocaleString()}</p>
            <p><b>Updated At:</b> ${new Date(roleDetails.updatedAt).toLocaleString()}</p>
            <p><b>Permissions:</b></p>
            <ul style="margin-left:15px;">
              ${
                Object.entries(roleDetails.permissions || {})
                  .filter(([_, v]) => v)
                  .map(
                    ([k]) =>
                      `<li>${k.replace(/_/g, " ").replace(/\b\\w/g, (l) => l.toUpperCase())}</li>`
                  )
                  .join("") || "<li>No permissions</li>"
              }
            </ul>
          </div>`,
        confirmButtonText: "Close",
        confirmButtonColor: "#4F46E5",
      });
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load role details.", "error");
    }
  };

  return (
    <>
      <PageMeta title="Manage Roles | VTS Admin" description="Manage system roles and permissions" />
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
        <PageBreadCrumb pageTitle="Manage Roles" />

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow p-5 max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-semibold text-gray-900 dark:text-gray-100">
              Manage Roles
            </h2>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              + Add Role
            </button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 dark:bg-gray-700 p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingRole ? "Edit Role" : "Create New Role"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.keys(defaultPermissions).map((permission) => (
                      <label key={permission} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            (formData.permissions as Permissions)[permission as keyof Permissions]
                          }
                          onChange={() => handlePermissionChange(permission as keyof Permissions)}
                          className="rounded accent-indigo-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingRole(null);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                  >
                    {editingRole ? "Update Role" : "Create Role"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full border-collapse text-gray-700 dark:text-gray-200">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Permissions</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No roles found
                      </td>
                    </tr>
                  ) : (
                    roles.map((role, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <td className="px-4 py-3 font-normal">{role.role_name}</td>
                        <td className="px-4 py-3 font-normal">{role.description}</td>
                        <td className="px-4 py-3 font-normal whitespace-nowrap">
                          {Object.values(role.permissions || {}).filter(Boolean).length} permissions
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleView(role)}
                              className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEdit(role)}
                              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(role)}
                              className="text-xs px-3 py-1 bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-100 rounded hover:bg-red-200 dark:hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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
