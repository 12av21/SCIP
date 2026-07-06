import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, Mail, Lock, Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("User not logged in.");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateProfile({ name, email });
      // toast.success is handled by AuthContext
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to update profile.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return <div className="loading-state">Loading profile...</div>; // Or a more elaborate loading spinner
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600/10 rounded-2xl">
          <UserIcon className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-display">My Profile</h1>
          <p className="opacity-60 text-sm">Manage your personal information and account settings.</p>
        </div>
      </div>

      <form onSubmit={handleProfileUpdate} className="stamp-card p-8 space-y-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
        <div className="space-y-2">
          <label htmlFor="name" className="text-xs font-mono uppercase tracking-widest opacity-50">Full Name</label>
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field w-full pl-12"
              placeholder="Your Full Name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-mono uppercase tracking-widest opacity-50">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field w-full pl-12"
              placeholder="your@example.com"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-ink/5 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-ink text-paper px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Changes"} <Save size={18} />
          </button>
        </div>
      </form>

      <div className="stamp-card p-8 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Security</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Change Password</p>
            <p className="text-sm opacity-60">Update your account password for enhanced security.</p>
          </div>
          <Link
            to="/forgot-password" // Reusing the forgot-password flow for changing password
            className="bg-brass text-paper px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
          >
            Change Password <Lock size={18} />
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] uppercase tracking-widest opacity-30 font-mono">
        Secured by SCIP Neural Protocol
      </div>
    </div>
  );
}