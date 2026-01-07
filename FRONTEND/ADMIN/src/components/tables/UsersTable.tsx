import React from "react";

/* ================= ICONS ================= */

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M2 12C4.5 7 8 5 12 5s7.5 2 10 7c-2.5 5-6 7-10 7s-7.5-2-10-7Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
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

/* ================= TYPES ================= */

interface User {
  _id?: string;
  user_id: string;
  name: string;
  email?: string;
  phone_number?: string | number;
  status: boolean;
  role_id?: number;
}

interface Props {
  users: User[];
  onToggleStatus: (id: string) => void;
  onEdit: (user: User) => void;
  onView: (id: string) => void;
  ActivateIcon: React.FC;
  DeactivateIcon: React.FC;
}

/* ================= HELPERS ================= */

const roleLabel = (id?: number) => {
  switch (id) {
    case 1: return "Superadmin";
    case 2: return "Operator";
    case 3: return "Driver";
    case 4: return "Parent / Guardian";
    default: return "—";
  }
};

/* ================= COMPONENT ================= */

const UsersTable: React.FC<Props> = ({
  users,
  onToggleStatus,
  onView,
  onEdit,
  ActivateIcon,
  DeactivateIcon,
}) => {
  return (
    <div className="w-full">
      <div
        id="users-table-scroll"
        className="max-h-[420px] overflow-y-auto rounded-lg border
        border-gray-200 dark:border-gray-700"
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            <tr className="text-gray-600 dark:text-gray-300">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.length > 0 ? (
              users.map((u, idx) => (
                <tr
                  key={u.user_id}
                  className={`border-t dark:border-gray-700
                  ${idx % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50 dark:bg-gray-800"}
                  hover:bg-blue-50/50 dark:hover:bg-gray-700 transition`}
                >
                  {/* USER */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500 text-white
                        flex items-center justify-center font-semibold">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {u.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {u.email || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* PHONE */}
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {u.phone_number || "—"}
                  </td>

                  {/* ROLE */}
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-md
                      bg-gray-200 dark:bg-gray-700
                      text-gray-700 dark:text-gray-300">
                      {roleLabel(u.role_id)}
                    </span>
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded
                      ${u.status
                        ? "text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                        : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400"
                      }`}
                    >
                      {u.status ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {/* VIEW */}
                      <button
                        title="View user"
                        onClick={() => onView(u.user_id)}
                        className="p-2 rounded-md text-blue-400 dark:text-gray-300
                        hover:bg-blue-50 hover:text-blue-600
                        dark:hover:bg-blue-900/40 transition"
                      >
                        <EyeIcon />
                      </button>

                      {/* EDIT */}
                      <button
                        title="Edit user"
                        onClick={() => onEdit(u)}
                        className="p-2 rounded-md text-gray-600 dark:text-gray-300
                        hover:bg-indigo-50 hover:text-indigo-600
                        dark:hover:bg-indigo-900/40 transition"
                      >
                        <EditIcon />
                      </button>

                      {/* TOGGLE STATUS */}
                      <button
                        title="Toggle status"
                        onClick={() => onToggleStatus(u.user_id)}
                        className="p-1 rounded-md
                        hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        {u.status ? <DeactivateIcon /> : <ActivateIcon />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No users found
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
