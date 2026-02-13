import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import PageShimmer from "../../components/common/PageShimmer";
import { rolesAPI } from "../../services/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

interface Role {
  role_id?: string;
  role_name: string;
  description: string;
  permissions: string[]; // Array of permission strings
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const defaultPermissions = [
  "read:vehicles",
  "write:vehicles",
  "read:drivers",
  "write:drivers",
];

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

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M2 12C4.5 7 8 5 12 5s7.5 2 10 7c-2.5 5-6 7-10 7s-7.5-2-10-7Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
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

      const res = await rolesAPI.list(pageNum, pageSize);
      if (res.status !== 200) throw new Error(res.message || "Failed to fetch roles");

      const fetchedRoles = res.data || [];
      setRoles(pageNum === 1 ? fetchedRoles : [...roles, ...fetchedRoles]);

      // Update total pages if API provides it
      setRoleTotalPages(res.totalPages || 1);
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
      if (!role.role_id) return;
      const res = await rolesAPI.getById(role.role_id);
      if (res.status !== 200) throw new Error(res.message || "Failed to fetch role details");
      
      const roleData = res.data;
      setEditingRole(roleData);
      setFormData({
        role_name: roleData.role_name,
        description: roleData.description,
        permissions: roleData.permissions || [],
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
      const res = editingRole
        ? await rolesAPI.update(editingRole.role_id!, formData)
        : await rolesAPI.create(formData);

      if (res.status !== 200 && res.status !== 201) throw new Error(res.message || "Failed to save role");

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
      if (!role.role_id) return;
      const res = await rolesAPI.toggleStatus(role.role_id);
      if (res.status !== 200) throw new Error(res.message || "Failed to change status");
      
      showSuccess(`Role ${role.status ? "deactivated" : "activated"}!`);
      fetchRoles();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to change status.", "error");
    }
  };

  /** View role details */
  const handleView = async (role: Role) => {
    try {
      if (!role.role_id) return;
      const res = await rolesAPI.getById(role.role_id);
      if (res.status !== 200 || !res.data)
        throw new Error(res.message || "Failed to load role details");

      const r = res.data;
      const darkMode = document.documentElement.classList.contains("dark");

      const formatVal = (val: any) => {
        if (val === null || val === undefined || val === "" || val === "—") return "N/A";
        return val;
      };

      const infoRow = (label: string, value: any) =>
        `<div style="padding:6px 0; font-size:14px; color:${darkMode ? "#e5e7eb" : "#111827"}"><b>${label}:</b> ${formatVal(value)}</div>`;

      Swal.fire({
        showCloseButton: true,
        showConfirmButton: false,
        width: 560,
        padding: "0",
        background: "transparent",
        html: `
        <div style="border-radius:22px; padding:2px; background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5); box-shadow:0 22px 60px rgba(0,0,0,.35);">
          <div style="background:${darkMode ? "#020617" : "#ffffff"}; border-radius:20px; overflow:hidden; font-family:Inter,system-ui,sans-serif; position:relative; text-align:left;">
            
            <div style="position:absolute; inset:0; pointer-events:none; background: radial-gradient(520px at top left, rgba(99,102,241,.14), transparent 40%), radial-gradient(420px at bottom right, rgba(34,211,238,.10), transparent 45%);"></div>

            <div style="position:relative; padding:16px 18px; background:linear-gradient(135deg,#4f46e5,#6366f1); display:flex; align-items:center; gap:12px;">
              <div style="width:46px;height:46px;border-radius:14px; background:rgba(255,255,255,.22); display:flex;align-items:center;justify-content:center; font-size:20px;font-weight:800;color:white; box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);">
                ${(r.role_name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size:17px;font-weight:700;color:white">${r.role_name}</div>
                <div style="font-size:12px;color:rgba(255,255,255,.85)">System Role</div>
              </div>
            </div>

            <div style="position:relative; padding:18px; color:${darkMode ? "#e5e7eb" : "#111827"}; font-size:13px">
              ${infoRow("Description", r.description)}
              ${infoRow("Permissions", Array.isArray(r.permissions) ? r.permissions.join(", ") : "None")}
              ${infoRow("Status", r.status ? `<span style="background:#10b98122;color:#10b981;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Active</span>` : `<span style="background:#ef444422;color:#ef4444;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Inactive</span>`)}

              <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:14px 0"/>

              ${infoRow("Created At", new Date(r.createdAt).toLocaleString())}
              ${infoRow("Last Updated", new Date(r.updatedAt).toLocaleString())}
            </div>
          </div>
        </div>
        `,
        customClass: { popup: "shadow-none" },
      });
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load role details.", "error");
    }
  };

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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Name <span className="text-red-500">*</span></label>
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

                <div>
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
                </div>

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
                      title="View Role"
                      onClick={() => handleView(role)}
                      className="p-2 rounded-md text-blue-600 dark:text-blue-400
                      hover:bg-blue-50 dark:hover:bg-blue-900/40 transition"
                    >
                      <EyeIcon />
                    </button>

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
