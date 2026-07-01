import {
  Bell,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200">

      <div className="flex justify-between items-center px-8 py-4">

        {/* Left */}

        <div>

          <h1 className="text-2xl font-bold text-slate-800">
            SCIP Command Center
          </h1>

          <p className="text-slate-500 text-sm">
            AI Powered Decision Intelligence
          </p>

        </div>

        {/* Right */}

        <div className="flex items-center gap-5">

          {/* Search */}

          <div className="hidden lg:flex items-center bg-slate-100 rounded-xl px-4 py-2">

            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              type="text"
              placeholder="Search..."
              className="ml-3 bg-transparent outline-none w-56"
            />

          </div>

          {/* Notification */}

          <button className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center">

            <Bell size={20} />

          </button>

          {/* Settings */}

          <button className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center">

            <Settings size={20} />

          </button>

          {/* User */}

          <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-3 py-2">

            <UserCircle2
              size={34}
              className="text-blue-600"
            />

            <div className="hidden md:block">

              <p className="font-semibold">
                Adarsh
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>

            </div>

          </div>

        </div>

      </div>

    </header>
  );
}