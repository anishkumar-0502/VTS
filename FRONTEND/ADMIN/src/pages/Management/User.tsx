import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import UsersTable from "../../components/tables/UsersTable";
import { usersAPI } from "../../services/api";

const DeactivateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="12" rx="6" fill="#ef4444" />
    <circle cx="18" cy="12" r="5" fill="#ffffff" />
  </svg>
);

const ActivateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="12" rx="6" fill="#10b981" />
    <circle cx="6" cy="12" r="5" fill="#ffffff" />
  </svg>
);

interface User {
  _id?: string;
  user_id: string;
  name: string;
  email?: string;
  phone_number?: string | number;
  role_id?: number;
  operator?: any | null;
  status: boolean;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<number>(2);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [hasMore, setHasMore] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    role_id: 2,
    operator_id: "",
  });

  const dark = document.documentElement.classList.contains("dark");
  const swalBase = { background: dark ? "#1f2937" : "#fff", color: dark ? "#e5e7eb" : "#111827" };

  const showSuccess = (msg: string) =>
    Swal.fire({ icon: "success", title: msg, background: swalBase.background, color: swalBase.color, timer: 1400, toast: true, position: "top-end", showConfirmButton: false });

  // fetch (page) -> append (infinite scroll)
const fetchUsers = async (pageValue = page) => {
  setLoading(true);

  const res = await usersAPI.list(pageValue, limit, selectedRole);
  const records = Array.isArray(res.data) ? res.data : [];

  if (records.length > 0) {
    if (pageValue === 1) {
      setUsers(records); // reset first page
    } else {
      // avoid duplication
      setUsers(prev => {
        const merged = [...prev, ...records];
        const unique = merged.filter(
          (item, index, array) => array.findIndex(i => i._id === item._id) === index
        );
        return unique;
      });
    }
  } else {
    setHasMore(false);
  }

  setLoading(false);
};



  // initial load & when role changes
  useEffect(() => {
    setUsers([]);
    setPage(1);
    setHasMore(true);
    fetchUsers(1);
  }, [selectedRole]);

  // infinite scroll
useEffect(() => {
  const container = document.getElementById("users-table-scroll");
  if (!container) return;

  const onScroll = () => {
    if (!hasMore || loading) return;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
      setPage((p) => p + 1);
    }
  };

  container.addEventListener("scroll", onScroll);
  return () => container.removeEventListener("scroll", onScroll);
}, [hasMore, loading]);



  // load additional pages
  useEffect(() => {
    if (page === 1) return;
    fetchUsers(page);
  }, [page]);

  // VIEW user details (SweetAlert modal)
// const handleView = async (userId: string) => {
//   try {
//     const res = await usersAPI.view(userId);

//     if (res.status !== 200 || !res.data)
//       throw new Error(res.message || "Failed to load user");

//     const u = res.data;
//     const darkMode = document.documentElement.classList.contains("dark");

//     const infoRow = (label: string, value: any) =>
//       `<div style="padding:6px 0; font-size:14px; color:${
//         darkMode ? "#e5e7eb" : "#111827"
//       }"><b>${label}:</b> ${value ?? "—"}</div>`;

//     const getRoleName = (rid?: number) => {
//       switch (rid) {
//         case 1: return "Super Admin";
//         case 2: return "Operator";
//         case 3: return "Driver";
//         case 4: return "Parent/Guardian";
//         default: return "Unknown";
//       }
//     };

//     // ------- EXTRA DETAILS BASED ON ROLE -------
//     const operatorDetails =
//       u.role_id === 2
//         ? `
//           ${infoRow("Organization", u.operator?.company_name)}
//           ${infoRow("City", u.operator?.city)}
//           ${infoRow("State", u.operator?.state)}
//           ${infoRow("Country", u.operator?.country)}
//         `
//         : "";

//     const driverDetails =
//       u.role_id === 3
//         ? infoRow("Assigned Vehicle", u.driver_profile?.vehicle_id ?? "Not Assigned")
//         : "";

//     const parentDetails =
//       u.role_id === 4
//         ? infoRow("Linked Student", u.end_user_profile ?? "Not Linked")
//         : "";

//     // Swal.fire({
//     //   showCloseButton: true,
//     //   showConfirmButton: false,
//     //   width: 520,
//     //   padding: "20px",
//     //   html: `
//     //     <div style="text-align:left">

//     //       <!-- Header -->
//     //       <div style="display:flex; gap:12px; align-items:center; padding-bottom:12px">
//     //         <div style="width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#4f46e520;color:#4f46e5;font-weight:700">
//     //           ${(u.name || "?").charAt(0).toUpperCase()}
//     //         </div>
//     //         <div>
//     //           <div style="font-weight:700;font-size:18px;color:${darkMode ? "#e5e7eb" : "#111827"}">${u.name}</div>
//     //           <div style="font-size:13px;color:${darkMode ? "#9ca3af" : "#6b7280"}">${getRoleName(u.role_id)}</div>
//     //         </div>
//     //       </div>

//     //       <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:10px 0" />

//     //       <!-- General Info -->
//     //       ${infoRow("Email", u.email)}
//     //       ${infoRow("Phone", u.phone_number)}

//     //       <!-- Role-Based Details -->
//     //       ${operatorDetails}
//     //       ${driverDetails}
//     //       ${parentDetails}

//     //       ${infoRow("Status", u.status 
//     //         ? '<span style="color:#10b981">Active</span>' 
//     //         : '<span style="color:#ef4444">Inactive</span>')}

//     //       <hr style="margin:12px 0; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}" />

//     //       <!-- System Metadata -->
//     //       ${infoRow("Created At", new Date(u.createdAt).toLocaleString())}
//     //       ${infoRow("Last Updated", new Date(u.updatedAt).toLocaleString())}
//     //     </div>
//     //   `,
//     //   customClass: { popup: "card-popup" },
//     // });


// Swal.fire({
//   showCloseButton: true,
//   showConfirmButton: false,
//   width: 560,
//   padding: "0",
//   background: "transparent",
//   html: `
//   <!-- GRADIENT BORDER -->
//   <div style="
//     border-radius:22px;
//     padding:2px;
//     background:linear-gradient(135deg,#6366f1,#22d3ee,#a855f7,#4f46e5);
//     box-shadow:0 22px 60px rgba(0,0,0,.35);
//   ">

//     <!-- INNER CARD -->
//     <div style="
//       background:${darkMode ? "#020617" : "#ffffff"};
//       border-radius:20px;
//       overflow:hidden;
//       font-family:Inter,system-ui,sans-serif;
//       position:relative;
//       text-align:left;
//     ">

//       <!-- SOFT GLOW -->
//       <div style="
//         position:absolute;
//         inset:0;
//         pointer-events:none;
//         background:
//           radial-gradient(520px at top left, rgba(99,102,241,.14), transparent 40%),
//           radial-gradient(420px at bottom right, rgba(34,211,238,.10), transparent 45%);
//       "></div>

//       <!-- HEADER -->
//       <div style="
//         position:relative;
//         padding:16px 18px;
//         background:linear-gradient(135deg,#4f46e5,#6366f1);
//         display:flex;
//         align-items:center;
//         gap:12px;
//       ">
//         <div style="
//           width:46px;height:46px;border-radius:14px;
//           background:rgba(255,255,255,.22);
//           display:flex;align-items:center;justify-content:center;
//           font-size:20px;font-weight:800;color:white;
//           box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);
//         ">
//           ${(u.name || "?").charAt(0).toUpperCase()}
//         </div>

//         <div>
//           <div style="font-size:17px;font-weight:700;color:white">
//             ${u.name}
//           </div>
//           <div style="font-size:12px;color:rgba(255,255,255,.85)">
//             ${getRoleName(u.role_id)}
//           </div>
//         </div>
//       </div>

//       <!-- CONTENT -->
//       <div style="
//         position:relative;
//         padding:18px;
//         color:${darkMode ? "#e5e7eb" : "#111827"};
//         font-size:13px
//       ">

//         ${infoRow("Email", u.email)}
//         ${infoRow("Phone", u.phone_number)}

//         ${operatorDetails}
//         ${driverDetails}
//         ${parentDetails}

//         ${infoRow(
//           "Status",
//           u.status
//             ? `<span style="background:#10b98122;color:#10b981;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Active</span>`
//             : `<span style="background:#ef444422;color:#ef4444;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Inactive</span>`
//         )}

//         <hr style="
//           border:none;
//           border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"};
//           margin:14px 0
//         "/>

//         ${infoRow("Created At", new Date(u.createdAt).toLocaleString())}
//         ${infoRow("Last Updated", new Date(u.updatedAt).toLocaleString())}

//       </div>
//     </div>
//   </div>
//   `,
//   customClass: { popup: "shadow-none" },
// });



//   } catch (err: any) {
//     Swal.fire({
//       icon: "error",
//       title: "Error",
//       text: err?.message || "Failed to fetch user",
//     });
//   }
// };

const handleView = async (userId: string) => {
  try {
    const res = await usersAPI.view(userId);

    if (res.status !== 200 || !res.data)
      throw new Error(res.message || "Failed to load user");

    const u = res.data;
    const darkMode = document.documentElement.classList.contains("dark");

    // 1. IMPROVED HELPER: Checks for null, undefined, empty strings, or the "—" character
    const formatVal = (val: any) => {
      if (val === null || val === undefined || val === "" || val === "—") {
        return "N/A";
      }
      return val;
    };

    const infoRow = (label: string, value: any) =>
      `<div style="padding:6px 0; font-size:14px; color:${
        darkMode ? "#e5e7eb" : "#111827"
      }"><b>${label}:</b> ${formatVal(value)}</div>`;

    const getRoleName = (rid?: number) => {
      switch (rid) {
        case 1: return "Super Admin";
        case 2: return "Operator";
        case 3: return "Driver";
        case 4: return "Parent/Guardian";
        default: return "Unknown";
      }
    };

    // 2. UPDATED DETAILS: Use formatVal for nested properties
    const operatorDetails =
      u.role_id === 2
        ? `
          ${infoRow("Organization", u.operator?.company_name)}
          ${infoRow("City", u.operator?.city)}
          ${infoRow("State", u.operator?.state)}
          ${infoRow("Country", u.operator?.country)}
        `
        : "";

    const driverDetails =
      u.role_id === 3
        ? infoRow("Assigned Vehicle", u.driver_profile?.vehicle_id)
        : "";

    const parentDetails =
      u.role_id === 4
        ? infoRow("Linked Student", u.end_user_profile)
        : "";

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
              ${(u.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:17px;font-weight:700;color:white">${u.name}</div>
              <div style="font-size:12px;color:rgba(255,255,255,.85)">${getRoleName(u.role_id)}</div>
            </div>
          </div>

          <div style="position:relative; padding:18px; color:${darkMode ? "#e5e7eb" : "#111827"}; font-size:13px">
            ${infoRow("Email", u.email)}
            ${infoRow("Phone", u.phone_number)}

            ${operatorDetails}
            ${driverDetails}
            ${parentDetails}

            ${infoRow(
              "Status",
              u.status
                ? `<span style="background:#10b98122;color:#10b981;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Active</span>`
                : `<span style="background:#ef444422;color:#ef4444;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">Inactive</span>`
            )}

            <hr style="border:none; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:14px 0"/>

            ${infoRow("Created At", u.createdAt ? new Date(u.createdAt).toLocaleString() : "N/A")}
            ${infoRow("Last Updated", u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "N/A")}
          </div>
        </div>
      </div>
      `,
      customClass: { popup: "shadow-none" },
    });

  } catch (err: any) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: err?.message || "Failed to fetch user",
    });
  }
};


  // open create/edit form
  const openEditForm = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setForm({
        name: u.name || "",
        email: u.email || "",
        phone_number: String(u.phone_number || ""),
        role_id: u.role_id || 2,
        operator_id: (u.operator && u.operator._id) || "",
      });
    } else {
      setEditingUser(null);
      setForm({ name: "", email: "", phone_number: "", role_id: 2, operator_id: "" });
    }
    setShowForm(true);
  };

  // save create/update
  const handleSave = async () => {
    // basic validation
    if (!form.name || !form.email) {
      Swal.fire({ ...swalBase, icon: "warning", title: "Validation", text: "Name and email are required" });
      return;
    }
    try {
      setLoading(true);
      if (editingUser) {
        const res = await usersAPI.update(editingUser.user_id, {
          name: form.name,
          email: form.email,
          phone_number: form.phone_number,
          role_id: form.role_id,
          operator_id: form.operator_id || null,
        });
        if (res.status === 200 || res.success) {
          showSuccess("User updated");
          setShowForm(false);
          setUsers([]);
          setPage(1);
          fetchUsers(1);
        } else {
          throw new Error(res.message || "Failed to update");
        }
      } else {
        const res = await usersAPI.create({
          name: form.name,
          email: form.email,
          phone_number: form.phone_number,
          role_id: form.role_id,
          operator_id: form.operator_id || null,
        });
        if (res.status === 200 || res.success) {
          showSuccess("User created");
          setShowForm(false);
          setUsers([]);
          setPage(1);
          fetchUsers(1);
        } else {
          throw new Error(res.message || "Failed to create");
        }
      }
    } catch (err: any) {
      Swal.fire({ ...swalBase, icon: "error", title: "Error", text: err?.message || "Failed to save" });
    } finally {
      setLoading(false);
    }
  };

  // toggle active/inactive
  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await usersAPI.toggleStatus(userId);
      if (res.status === 200 || res.success) {
        showSuccess("User status updated");
        // refresh list
        setUsers([]);
        setPage(1);
        fetchUsers(1);
      } else {
        throw new Error(res.message || "Failed to toggle");
      }
    } catch (err: any) {
      Swal.fire({ ...swalBase, icon: "error", title: "Error", text: err?.message || "Unable to toggle status" });
    }
  };

  return (
    <>
      <PageMeta title="User Management | Superadmin" description="Manage all users" />
      <div>
        <PageBreadCrumb pageTitle="User Management" />

        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 dark:bg-gray-900 dark:border-gray-800 max-w-6xl mx-auto overflow-x-hidden">
        <div className="flex items-center justify-between px-5 py-4 mb-6">
  {/* Title */}
  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
    Manage Users
  </h2>

  {/* Role Filter */}
  <div className="relative">
    <select
      value={selectedRole}
      onChange={(e) => setSelectedRole(Number(e.target.value))}
      className="appearance-none rounded-full px-4 py-2 pr-8
                 text-sm font-medium
                 bg-indigo-50 dark:bg-gray-800
                 text-indigo-700 dark:text-indigo-300
                 border border-indigo-200 dark:border-gray-700
                 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option value={1}>Superadmin</option>
      <option value={2}>Operator</option>
      <option value={3}>Driver</option>
      <option value={4}>Parent / Guardian</option>
    </select>

    {/* Dropdown Icon */}
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500">
      ▼
    </span>
  </div>
</div>


          {/* FORM */}
      {/* FORM */}
{showForm && (
  <div className="mb-6 p-5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 transition-all">
    
    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white tracking-wide">
      {editingUser ? "Edit User" : "Create User"}
    </h3>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Name */}
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Full Name"
        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
      />

      {/* Email */}
      <input
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="Email Address"
        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
      />

      {/* Phone */}
      <input
        value={form.phone_number}
        onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
        placeholder="Phone Number"
        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
      />

      {/* Role Select */}
      <select
        value={form.role_id}
        onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}
        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
      >
        <option value={1}>Superadmin</option>
        <option value={2}>Operator</option>
        <option value={3}>Driver</option>
        <option value={4}>Parent / Guardian</option>
      </select>
    </div>

    {/* Buttons */}
    <div className="flex justify-end gap-3 mt-5">
      <button
        className="px-4 py-2 border rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        onClick={() => { setShowForm(false); setEditingUser(null); }}
      >
        Cancel
      </button>

      <button
        disabled={loading}
        className="px-4 py-2 rounded-md bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white transition"
        onClick={handleSave}
      >
        {editingUser ? "Update User" : "Create User"}
      </button>
    </div>
  </div>
)}


          {/* TABLE */}
{!showForm && (
  <div className="w-full overflow-x-auto">
    <UsersTable
      users={users}
      onToggleStatus={handleToggleStatus}
      onView={handleView}
      onEdit={(u) => openEditForm(u)}
      ActivateIcon={ActivateIcon}
      DeactivateIcon={DeactivateIcon}
    />
  </div>
)}

        </div>
      </div>
    </>
  );
}
