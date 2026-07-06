import React, { useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { User as UserIcon, Mail, Shield, CheckCircle2, XCircle, Edit, Trash2, Search, Loader2, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

// Define the User interface, matching the AuthContext's User
interface User {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  role: 'citizen' | 'admin' | 'super_admin';
  createdAt: string;
}

const USER_ROLES = ['citizen', 'admin', 'super_admin'];

export default function UserManagement() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<'citizen' | 'admin' | 'super_admin'>('citizen');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to fetch users.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (userToEdit: User) => {
    setEditingUserId(userToEdit.id);
    setEditingUserRole(userToEdit.role);
  };

  const handleSaveRole = async (userId: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/admin/users/${userId}`, { role: editingUserRole });
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, role: editingUserRole } : u))
      );
      toast.success("User role updated successfully!");
      setEditingUserId(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to update user role.";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      toast.success("User deleted successfully!");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to delete user.";
      toast.error(message);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return <div className="loading-state">Access Denied. Only administrators can view this page.</div>;
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display">User Management</h1>
          <p className="opacity-60 text-sm italic">Manage all platform users and their roles.</p>
        </div>
        <div className="bg-ink text-paper px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2">
          <Shield size={14} className="text-brass" /> ADMIN PANEL
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stamp-card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="bg-ink/5 p-4 border-b border-ink/10 flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              className="field w-full pl-12 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-ink" size={24} />
                  <p className="text-sm text-slate-500 mt-2">Loading users...</p>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {editingUserId === user.id ? (
                      <select
                        value={editingUserRole}
                        onChange={(e) => setEditingUserRole(e.target.value as 'citizen' | 'admin' | 'super_admin')}
                        className="field text-sm py-1"
                        disabled={isUpdating || currentUser?.id === user.id} // Prevent changing own role
                      >
                        {USER_ROLES.map(role => (
                          <option key={role} value={role}>{role.replace('_', ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge ${user.role === 'super_admin' ? 'badge-critical' : user.role === 'admin' ? 'badge-risk' : 'badge-resolved'}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td>
                    {user.isVerified ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <XCircle size={18} className="text-red-500" />
                    )}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    {editingUserId === user.id ? (
                      <button
                        onClick={() => handleSaveRole(user.id)}
                        disabled={isUpdating || currentUser?.id === user.id}
                        className="btn-icon text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                        title="Save Role"
                      >
                        <Save size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditRole(user)}
                        disabled={currentUser?.id === user.id} // Prevent editing own role
                        className="btn-icon text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        title="Edit Role"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={currentUser?.id === user.id || currentUser?.role !== 'super_admin'} // Only super_admin can delete, and not self
                      className="btn-icon text-red-600 hover:text-red-800 ml-2 disabled:opacity-50"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </>
  );
}