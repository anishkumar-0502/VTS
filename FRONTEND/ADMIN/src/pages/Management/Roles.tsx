import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import { rolesAPI } from "../../services/api";

interface Role {
  _id: number;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
}

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

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: { ...defaultPermissions },
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await rolesAPI.getAll();
      if (response.success && response.data?.roles) {
        setRoles(response.data.roles);
        setError("");
      } else {
        setError(response.message || "Failed to fetch roles");
      }
    } catch {
      setError("Error fetching roles");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: { ...defaultPermissions, ...role.permissions },
    });
    setShowForm(true);
  };

  const handleDelete = async (roleId: number) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        const response = await rolesAPI.delete(roleId.toString());
        if (response.success) {
          setRoles(roles.filter((r) => r._id !== roleId));
          setError("");
        } else {
          setError(response.message || "Failed to delete role");
        }
      } catch {
        setError("Error deleting role");
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Role name is required");
      return;
    }

    try {
      let response;
      if (editingRole) {
        response = await rolesAPI.update(editingRole._id.toString(), formData);
      } else {
        response = await rolesAPI.create(formData);
      }

      if (response.success) {
        await fetchRoles();
        setShowForm(false);
        setEditingRole(null);
        setFormData({ name: "", description: "", permissions: { ...defaultPermissions } });
        setError("");
      } else {
        setError(response.message || "Failed to save role");
      }
    } catch {
      setError("Error saving role");
    }
  };

  const handlePermissionChange = (permission: keyof Permissions) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: !formData.permissions[permission],
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading roles...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Roles Management | VTS Admin"
        description="Manage system roles and permissions"
      />
      <div>
        <PageBreadCrumb pageTitle="Roles" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage Roles
            </h2>
            <Button
              onClick={() => {
                setEditingRole(null);
                setFormData({ name: "", description: "", permissions: { ...defaultPermissions } });
                setShowForm(true);
              }}
              size="sm"
            >
              Add Role
            </Button>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingRole ? "Edit Role" : "Create New Role"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(defaultPermissions).map((permission) => (
                      <label key={permission} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions[permission as keyof Permissions]}
                          onChange={() => handlePermissionChange(permission as keyof Permissions)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {permission.replace(/_/g, " ").charAt(0).toUpperCase() +
                            permission.replace(/_/g, " ").slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      setEditingRole(null);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} size="sm">
                    {editingRole ? "Update" : "Create"} Role
                  </Button>
                </div>
              </div>
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
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Permissions
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">
                      {role.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {role.description}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-block bg-blue-50 px-2 py-1 rounded text-xs dark:bg-blue-900/20 dark:text-blue-400">
                        {Object.values(role.permissions || {}).filter(Boolean).length} permissions
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(role._id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {roles.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">No roles found</div>
          )}
        </div>
      </div>
    </>
  );
}
