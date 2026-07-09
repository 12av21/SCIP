import { NavLink, useNavigate, Link, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  LogOut,
  Bell,
  User as UserIcon,
  CheckCircle2,
  Clock,
  Settings as SettingsIcon,
  ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

interface CitizenLayoutProps {
  children?: ReactNode;
}

export default function CitizenLayout({ children }: CitizenLayoutProps) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, text: "Complaint #W-882 has been resolved!", time: "2h ago", type: "success" },
    { id: 2, text: "Electrical team dispatched for #E-102", time: "5h ago", type: "info" },
  ];

  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/citizen", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/citizen/submit", label: "Report Issue", icon: FilePlus2 },
    { to: "/citizen/history", label: "My Complaints", icon: History },
  ];

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">C</div>
          <div>
            <div className="shell-brand-name">SCIP</div>
            <div className="shell-brand-sub mono">Citizen Portal</div>
          </div>
        </div>

        <nav className="shell-nav">
          <div className="shell-nav-section">
            <div className="shell-nav-label">Community Tools</div>
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => "shell-nav-link" + (isActive ? " is-active" : "")}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-auto p-4 border-t border-slate-100/10">
             <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-blue-600/10">
               <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">{user?.name?.[0]}</div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{user?.name}</div>
             </div>
          </div>
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <span className="shell-topbar-title mono">Public Service Dashboard</span>
          <div className="ml-auto flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <span className="font-bold text-sm">Notifications</span>
                    <span className="text-[10px] font-black uppercase text-blue-600 cursor-pointer hover:underline">Clear All</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                        <div className="flex gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {n.type === 'success' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-900 leading-snug">{n.text}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/citizen/notifications" onClick={() => setShowNotifications(false)} className="block p-3 text-center text-xs font-bold text-blue-600 bg-white hover:bg-slate-50 transition-colors border-t border-slate-50">
                    View All Updates
                  </Link>
                </div>
              )}
            </div>
            
            <Link to="/citizen/profile" className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Profile">
              <UserIcon size={18} />
            </Link>
            <Link to="/citizen/settings" className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Settings">
              <SettingsIcon size={18} />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-red-600 hover:text-white"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>
        <main className="shell-content bg-slate-50">{children || <Outlet />}</main>
      </div>
    </div>
  );
}