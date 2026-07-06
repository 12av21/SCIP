import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  BarChart3,
  ShieldAlert,
  MessageSquareText,
  Sparkles,
  ListOrdered,
  Users,
  ClipboardList,
  Hammer,
  LogOut,
} from "lucide-react";
import "./Layout.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/submit", label: "Submit complaint", icon: FilePlus2 },
      { to: "/admin/complaints", label: "Complaints", icon: FileText },
      { to: "/admin/resources", label: "Resources", icon: Hammer },
    ],
  },
  {
    label: "Insight",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/risk", label: "Community risk", icon: ShieldAlert },
      { to: "/admin/ranking", label: "Area ranking", icon: ListOrdered },
      { to: "/admin/community-analysis", label: "Community analysis", icon: Users },
    ],
  },
  {
    label: "AI tools",
    items: [
      { to: "/admin/assistant", label: "Assistant", icon: MessageSquareText },
      { to: "/admin/gemini-analysis", label: "Gemini analysis", icon: Sparkles },
      { to: "/admin/recommendations", label: "Recommendations", icon: ClipboardList },
    ],
  },
  {
    label: "Reporting",
    items: [{ to: "/admin/report", label: "Executive report", icon: FileText }],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <span className="shell-brand-mark">SC</span>
          <div>
            <div className="shell-brand-name">SCIP</div>
            <div className="shell-brand-sub mono">Case Intelligence Portal</div>
          </div>
        </div>

        <nav className="shell-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="shell-nav-section" key={section.label}>
              <div className="shell-nav-label">{section.label}</div>
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    "shell-nav-link" + (isActive ? " is-active" : "")
                  }
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <span className="shell-topbar-title mono">Community filing &amp; risk system</span>
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-red-600 hover:text-white"
            title="Logout"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
