import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import PageShimmer from "../../components/common/PageShimmer";

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

  const [rolePage, setRolePage] = useState(1); // current page
const [roleTotalPages, setRoleTotalPages] = useState(1); // total pages from API
const [loadingMoreRoles, setLoadingMoreRoles] = useState(false); // lazy load state
const pageSize = 10; // items per page

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

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
      stroke="currentColor"
      strokeWidth="2"
    />
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


  /** Fetch roles */
const fetchRoles = async (pageNum = 1) => {
  try {
    if (pageNum === 1) setLoading(true);
    else setLoadingMoreRoles(true);

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/roles/list?page=${pageNum}&limit=${pageSize}`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch roles");

    const fetchedRoles = data.data || [];
    setRoles(pageNum === 1 ? fetchedRoles : [...roles, ...fetchedRoles]);

    // Update total pages if API provides it
    setRoleTotalPages(data.totalPages || 1);
    setRolePage(pageNum);
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Failed to fetch roles.");
  } finally {
    setLoading(false);
    setLoadingMoreRoles(false);
  }
};


  useEffect(() => {
    fetchRoles(1);
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

     showSuccess(editingRole ? "Role updated!" : "Role created!");
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
showSuccess(`Role ${role.status ? "deactivated" : "activated"}!`);
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

if (loading)
  return (
    <PageShimmer />
  );

  return (
    <>
      <PageMeta title="Manage Roles | VTS Admin" description="Manage system roles and permissions" />
      <div className="overflow-x-hidden"> {/* ✅ prevents full page scroll horizontally */}
        <PageBreadCrumb pageTitle="Manage Roles" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-semibold text-gray-900 dark:text-gray-100">Roles</h2>
             {!showForm && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + Add Role
            </button>
             )}
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
{!showForm && (
  <div className="relative w-full overflow-hidden">
    <div
      className="max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg"
      onScroll={(e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (
          scrollTop + clientHeight >= scrollHeight - 20 &&
          rolePage < roleTotalPages &&
          !loadingMoreRoles
        ) {
          fetchRoles(rolePage + 1);
        }
      }}
    >
      <table className="w-full text-sm">
        {/* HEADER */}
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
          <tr className="text-gray-600 dark:text-gray-300">
            <th className="px-4 py-3 text-left font-semibold">Role</th>
            <th className="px-4 py-3 text-left font-semibold">Description</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {roles.length > 0 ? (
            roles.map((role, idx) => (
              <tr
                key={role.role_id}
                className={`
                  border-t dark:border-gray-700
                  ${idx % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50 dark:bg-gray-800"}
                  hover:bg-blue-50/50 dark:hover:bg-gray-700 transition
                `}
              >
                {/* ROLE NAME */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full bg-indigo-500 text-white
                      flex items-center justify-center font-semibold"
                    >
                      {role.role_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {role.role_name}
                      </p>
                    </div>
                  </div>
                </td>

                {/* DESCRIPTION */}
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {role.description || "—"}
                </td>

                {/* STATUS */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded
                      ${
                        role.status
                          ? "text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                          : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400"
                      }`}
                  >
                    {role.status ? "Active" : "Inactive"}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      title="Toggle Status"
                      onClick={() => handleToggleStatus(role)}
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {role.status ? <DeactivateIcon /> : <ActivateIcon />}
                    </button>

                    <button
                      title="Edit Role"
                      onClick={() => handleEdit(role)}
                      className="p-2 rounded-md text-gray-600 dark:text-gray-300
                      hover:bg-indigo-50 hover:text-indigo-600
                      dark:hover:bg-indigo-900/40 transition"
                    >
                      <EditIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="text-center py-8 text-gray-500 dark:text-gray-400"
              >
                No roles found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {loadingMoreRoles && (
        <div className="text-center py-2 text-gray-500 dark:text-gray-400">
          Loading more roles...
        </div>
      )}
    </div>
  </div>
)}



        </div>
      </div>
    </>
  );
}
