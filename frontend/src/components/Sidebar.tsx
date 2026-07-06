import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  BarChart3,
  Map,
  Sparkles,
  ClipboardCopy,
  FilePieChart,
  Layers,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "submit-complaint", label: "Submit Complaint", icon: FileText },
  { id: "complaints", label: "Complaints Hub", icon: AlertTriangle },
  { id: "analytics", label: "Analytics Console", icon: BarChart3 },
  { id: "community-risk", label: "Community Risk", icon: Map },
  { id: "recommendations", label: "AI Recommendations", icon: Sparkles },
  { id: "executive-report", label: "Executive Report", icon: FilePieChart },
  { id: "gemini-analysis", label: "Gemini Analysis", icon: Layers },
  { id: "community-analysis", label: "Community Analysis", icon: ClipboardCopy },
  { id: "area-ranking", label: "Area Ranking", icon: TrendingUp },
];

export default function Sidebar({
  activePage,
  setActivePage,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <aside
      className={`sticky top-0 left-0 z-30 flex h-screen shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 text-slate-400 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg">
                S
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">
                  SCIP
                </h2>

                <p className="text-[10px] text-slate-400">
                  Smart Community Intelligence Platform
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              S
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-2 transition hover:bg-slate-800 hover:text-white"
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-lg"
                    : "hover:translate-x-1 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-cyan-300" />
                )}

                <Icon
                  size={20}
                  className={
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-white"
                  }
                />

                {!isCollapsed && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}

                {isCollapsed && (
                  <div className="pointer-events-none absolute left-16 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={20} className="text-slate-400 group-hover:text-red-50" />
          {!isCollapsed && <span className="truncate">Sign Out</span>}
          {isCollapsed && (
            <div className="pointer-events-none absolute left-16 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              Sign Out
            </div>
          )}
        </button>

        {!isCollapsed && (
          <div className="p-1">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

            <div>
              <p className="text-xs font-semibold text-white">
                System Online
              </p>

              <p className="text-[11px] text-slate-500">
                SCIP v1.4.2
              </p>
            </div>
          </div>
          </div>
        )}
      </div>
    </aside>
  );
}