import { Bell, Search, Cpu, LogOut } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  activePage: string;
}

export default function Navbar({ activePage }: NavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatBreadcrumb = (slug: string) =>
    slug
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-xl shadow-sm">

      {/* Left */}

      <div>

        <p className="text-xs text-slate-500 font-medium">
          Smart Community Intelligence Platform
        </p>

        <h1 className="text-xl font-bold text-slate-900">
          {formatBreadcrumb(activePage)}
        </h1>

      </div>

      {/* Right */}

      <div className="flex items-center gap-4">

        {/* Search */}

        <div className="relative hidden lg:block">

          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search complaints..."
            className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          />

        </div>

        {/* Gemini */}

        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">

          <Cpu
            size={16}
            className="animate-pulse text-emerald-600"
          />

          <span className="text-xs font-semibold text-emerald-700">
            Gemini Ready
          </span>

        </div>

        {/* Notification */}

        <button
          type="button"
          className="relative rounded-xl bg-slate-100 p-3 transition hover:bg-slate-200"
        >

          <Bell size={18} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600"></span>

        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600 group"
          title="Sign Out"
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="hidden xl:block text-sm font-bold">
            Sign Out
          </span>
        </button>

        {/* Profile Link */}
        <Link to={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/profile' : '/citizen/profile'} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          {/* Profile Icon/Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
            {user?.name?.[0] || 'A'}
          </div>

          {/* User Info */}
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-900">
              {user?.name}
            </p>

            <p className="text-xs text-slate-500">
              {user?.role === 'super_admin' ? 'Super Admin' : 'Authority Officer'}
            </p>
          </div>
        </Link>

      </div>

    </header>
  );
}