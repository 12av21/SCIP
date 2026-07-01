import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  BarChart3,
  TriangleAlert,
  BrainCircuit,
  FileText,
} from "lucide-react";

import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-72 bg-slate-900 text-white min-h-screen">

      <div className="p-6 border-b border-slate-700">

        <h1 className="text-3xl font-bold">
          SCIP
        </h1>

        <p className="text-slate-400 text-sm">
          AI Decision Platform
        </p>

      </div>

      <nav className="p-5 space-y-2">

        <Link
          to="/"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <LayoutDashboard />
          Dashboard
        </Link>

        <Link
          to="/submit"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <PlusCircle />
          Submit Complaint
        </Link>

        <Link
          to="/complaints"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <ClipboardList />
          Complaints
        </Link>

        <Link
          to="/analytics"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <BarChart3 />
          Analytics
        </Link>

        <Link
          to="/risk"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <TriangleAlert />
          Community Risk
        </Link>

        <Link
          to="/recommendations"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <BrainCircuit />
          AI Recommendations
        </Link>

        <Link
          to="/report"
          className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-3"
        >
          <FileText />
          Executive Report
        </Link>

      </nav>

    </aside>
  );
}