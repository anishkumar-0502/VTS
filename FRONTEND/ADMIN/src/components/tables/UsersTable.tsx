import React from "react";

interface User {
  _id?: string;
  user_id: string;
  name: string;
  email?: string;
  phone_number?: string | number;
  status: boolean;
  role_id?: number;
  operator?: any | null;
}

interface Props {
  users: User[];
  onToggleStatus: (id: string) => void;
  onEdit: (user: User) => void;
  onView: (id: string) => void;
  ActivateIcon: React.FC;
  DeactivateIcon: React.FC;
}

const UsersTable: React.FC<Props> = ({
  users,
  onToggleStatus,
  onView,
  onEdit,
  ActivateIcon,
  DeactivateIcon
}) => {
  return (
<div className="w-full overflow-x-auto">
  <div
    id="users-table-scroll"
    className="max-h-[400px] overflow-y-auto scroll-smooth border border-gray-200 dark:border-gray-700 rounded-lg"
  >
    <table className="min-w-[900px] w-full border-collapse">
      <thead>
        <tr className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
          {["Name", "Email", "Phone", "Role", "Status", "Actions"].map((h) => (
            <th
              key={h}
              className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
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
              <td className="px-3 py-2 whitespace-nowrap">{u.name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{u.email || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{u.phone_number || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {u.role_id === 1
                  ? "Superadmin"
                  : u.role_id === 2
                  ? "Operator"
                  : u.role_id === 3
                  ? "Driver"
                  : u.role_id === 4
                  ? "Parent/Guardian"
                  : "—"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
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
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    title="Toggle status"
                    onClick={() => onToggleStatus(u.user_id)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    {u.status ? <DeactivateIcon /> : <ActivateIcon />}
                  </button>

                  <button
                    onClick={() => onView(u.user_id)}
                    className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 font-normal dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    View
                  </button>

                  <button
                    onClick={() => onEdit(u)}
                    className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-normal dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
              No users found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>


  );
};

export default UsersTable;
