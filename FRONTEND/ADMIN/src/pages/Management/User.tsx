import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import UsersTable from "../../components/tables/UsersTable";
import { usersAPI } from "../../services/api";

const API_EMPTY_ID = "";

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
const handleView = async (userId: string) => {
  try {
    const res = await usersAPI.view(userId);

    if (res.status !== 200 || !res.data)
      throw new Error(res.message || "Failed to load user");

    const u = res.data;
    const darkMode = document.documentElement.classList.contains("dark");

    const infoRow = (label: string, value: any) =>
      `<div style="padding:6px 0; font-size:14px; color:${
        darkMode ? "#e5e7eb" : "#111827"
      }"><b>${label}:</b> ${value ?? "—"}</div>`;

    const getRoleName = (rid?: number) => {
      switch (rid) {
        case 1: return "Super Admin";
        case 2: return "Operator";
        case 3: return "Driver";
        case 4: return "Parent/Guardian";
        default: return "Unknown";
      }
    };

    // ------- EXTRA DETAILS BASED ON ROLE -------
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
        ? infoRow("Assigned Vehicle", u.driver_profile?.vehicle_id ?? "Not Assigned")
        : "";

    const parentDetails =
      u.role_id === 4
        ? infoRow("Linked Student", u.end_user_profile ?? "Not Linked")
        : "";

    Swal.fire({
      showCloseButton: true,
      showConfirmButton: false,
      width: 520,
      padding: "20px",
      html: `
        <div style="text-align:left">

          <!-- Header -->
          <div style="display:flex; gap:12px; align-items:center; padding-bottom:12px">
            <div style="width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#4f46e520;color:#4f46e5;font-weight:700">
              ${(u.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:700;font-size:18px;color:${darkMode ? "#e5e7eb" : "#111827"}">${u.name}</div>
              <div style="font-size:13px;color:${darkMode ? "#9ca3af" : "#6b7280"}">${getRoleName(u.role_id)}</div>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}; margin:10px 0" />

          <!-- General Info -->
          ${infoRow("Email", u.email)}
          ${infoRow("Phone", u.phone_number)}

          <!-- Role-Based Details -->
          ${operatorDetails}
          ${driverDetails}
          ${parentDetails}

          ${infoRow("Status", u.status 
            ? '<span style="color:#10b981">Active</span>' 
            : '<span style="color:#ef4444">Inactive</span>')}

          <hr style="margin:12px 0; border-top:1px solid ${darkMode ? "#374151" : "#e5e7eb"}" />

          <!-- System Metadata -->
          ${infoRow("Created At", new Date(u.createdAt).toLocaleString())}
          ${infoRow("Last Updated", new Date(u.updatedAt).toLocaleString())}
        </div>
      `,
      customClass: { popup: "card-popup" },
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Users</h2>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">Role</label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(Number(e.target.value))}
                  className="border px-3 py-1 rounded-md dark:bg-gray-800 dark:text-white">
                  <option value={1}>Superadmin</option>
                  <option value={2}>Operator</option>
                  <option value={3}>Driver</option>
                  <option value={4}>Parent/Guardian</option>
                </select>
              </div>

              {/* <Button size="sm" onClick={() => openEditForm()} disabled={showForm}>
                + Add User
              </Button> */}
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
          <div className="w-full overflow-x-auto">
            <UsersTable
              users={users}
              onToggleStatus={handleToggleStatus}
              onView={handleView}
              onEdit={(u) => openEditForm(u)}
              ActivateIcon={ActivateIcon}
              DeactivateIcon={DeactivateIcon}
            />
            {/* {loading && <div className="py-4 text-center text-gray-600">Loading more users...</div>}
            {!hasMore && <div className="py-4 text-center text-gray-500">No more users to load.</div>} */}
          </div>
        </div>
      </div>
    </>
  );
}
