import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import "./Layout.css";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/submit", label: "Submit complaint", icon: FilePlus2 },
      { to: "/complaints", label: "Complaints", icon: FileText },
    ],
  },
  {
    label: "Insight",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/risk", label: "Community risk", icon: ShieldAlert },
      { to: "/ranking", label: "Area ranking", icon: ListOrdered },
      { to: "/community-analysis", label: "Community analysis", icon: Users },
    ],
  },
  {
    label: "AI tools",
    items: [
      { to: "/assistant", label: "Assistant", icon: MessageSquareText },
      { to: "/gemini-analysis", label: "Gemini analysis", icon: Sparkles },
      { to: "/recommendations", label: "Recommendations", icon: ClipboardList },
    ],
  },
  {
    label: "Reporting",
    items: [{ to: "/report", label: "Executive report", icon: FileText }],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
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
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
