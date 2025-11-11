import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.39:8787";

interface Role {
  role_id?: string;
  role_name: string;
  description: string;
  permissions: string[]; // Array of permission strings
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// const defaultPermissions = [
//   "read:vehicles",
//   "write:vehicles",
//   "read:drivers",
//   "write:drivers",
//   "read:alerts",
//   "write:alerts",
//   "read:analytics",
//   "write:analytics",
// ];

export default function ManageRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<Role>({
    role_name: "",
    description: "",
    permissions: [],
  });

  /** Fetch roles */
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/roles/list`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch roles");
      setRoles(data.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch roles.");
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
    setFormData({ role_name: "", description: "", permissions: [] });
    setShowForm(true);
  };

  /** Open edit form */
  const handleEdit = async (role: Role) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/roles/${role.role_id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch role details");
      setEditingRole(data.data);
      setFormData({
        role_name: data.data.role_name,
        description: data.data.description,
        permissions: data.data.permissions || [],
      });
      setShowForm(true);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load role details.", "error");
    }
  };

  /** Toggle permission in form */
  const handlePermissionChange = (perm: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  /** Create or update role */
  const handleSave = async () => {
    if (!formData.role_name.trim()) {
      Swal.fire("Validation", "Role name is required", "warning");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingRole
        ? `${BASE_URL}/superadmin/roles/${editingRole.role_id}/update`
        : `${BASE_URL}/superadmin/roles/create`;
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save role");

      Swal.fire("Success", editingRole ? "Role updated!" : "Role created!", "success");
      setShowForm(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save role.", "error");
    }
  };

  /** Deactivate role */
  const handleToggleStatus = async (role: Role) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/superadmin/roles/${role.role_id}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to change status");
      Swal.fire("Success", `Role ${role.status ? "deactivated" : "activated"}!`, "success");
      fetchRoles();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to change status.", "error");
    }
  };

  /** View role */
  // const handleView = async (role: Role) => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const res = await fetch(`${BASE_URL}/superadmin/roles/${role.role_id}/view`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.message || "Failed to fetch role details");

  //     const r = data.data;
  //     Swal.fire({
  //       title: `<strong>${r.role_name}</strong>`,
  //       html: `
  //         <p><b>Description:</b> ${r.description}</p>
  //         <p><b>Status:</b> ${r.status ? "Active" : "Inactive"}</p>
  //         <p><b>Permissions:</b> ${r.permissions.join(", ") || "-"}</p>
  //         <p><b>Created At:</b> ${new Date(r.createdAt).toLocaleString()}</p>
  //         <p><b>Updated At:</b> ${new Date(r.updatedAt).toLocaleString()}</p>
  //       `,
  //       confirmButtonText: "Close",
  //       confirmButtonColor: "#4F46E5",
  //     });
  //   } catch (err: any) {
  //     Swal.fire("Error", err.message || "Failed to load role details.", "error");
  //   }
  // };

  return (
    <>
      <PageMeta title="Manage Roles | VTS Admin" description="Manage system roles and permissions" />
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <PageBreadCrumb pageTitle="Manage Roles" />

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow p-5 max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-semibold text-gray-900 dark:text-gray-100">Roles</h2>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + Add Role
            </button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 dark:bg-gray-700 p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingRole ? "Edit Role" : "Create Role"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Name</label>
                  <input
                    type="text"
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {defaultPermissions.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={() => handlePermissionChange(perm)}
                          className="rounded accent-indigo-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {perm.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div> */}

                <div className="flex justify-end gap-3 pt-4">
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    {editingRole ? "Update Role" : "Create Role"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {/* {["Name", "Description", "Permissions", "Status", "Actions"].map((h) => ( */}
                    {["Name", "Description", "Status", "Actions"].map((h) => (
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
                {roles.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No roles found
                    </td>
                  </tr>
                )}
                {roles.map((role) => (
                  <tr key={role.role_id} className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    <td className="px-2 py-2">{role.role_name}</td>
                    <td className="px-2 py-2">{role.description}</td>
                    {/* <td className="px-2 py-2">{role.permissions.join(", ") || "-"}</td> */}
                    <td className="px-2 py-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          role.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {role.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        {/* <button
                          onClick={() => handleView(role)}
                          className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                        >
                          View
                        </button> */}
                        <button
                          onClick={() => handleEdit(role)}
                          className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(role)}
                          className={`text-xs px-3 py-1 rounded ${
                            role.status ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {role.status ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
