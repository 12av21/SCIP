import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CommunityMap from "../components/CommunityMap";
import { 
  FilePlus2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom"; //
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api"; // Use centralized API client

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => { //
      try {
        const res = await api.get("/complaints");
        // Filter for "current user" logic - simulating for demo
        setComplaints(res.data);
      } catch (e) {
        toast.error("Failed to sync dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const activeCount = complaints.filter(c => c.status !== "Resolved").length;
  const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
  const aiInteractions = complaints.length > 0 ? complaints.length + 3 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome Section */}
      <header> {/* */}
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.name || 'Resident'}</h1> {/* Use user.name */}
        <p className="text-slate-500 mt-2 font-medium">Manage your community reports and track resolution progress.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Active Reports</p>
            <h3 className="text-2xl font-black text-slate-900">{loading ? "..." : activeCount}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Resolved</p>
            <h3 className="text-2xl font-black text-slate-900">{loading ? "..." : resolvedCount}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">AI Suggestions</p>
            <h3 className="text-2xl font-black text-slate-900">{loading ? "..." : aiInteractions}</h3>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Quick Report Action */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden group"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
          <div className="relative z-10">
            <FilePlus2 size={40} className="mb-6" />
            <h2 className="text-2xl font-bold mb-2">Report a New Issue</h2>
            <p className="text-blue-100 mb-8 max-w-[280px]">
              Spotted a community problem? Report it now and let Gemini AI prioritize it for the authorities.
            </p>
            <Link 
              to="/citizen/submit" 
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold hover:gap-4 transition-all"
            >
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>

        {/* Latest Update */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Latest Update</h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">2 hours ago</span>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-10 w-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Complaint #W-882 Resolved</p>
                <p className="text-xs text-slate-500 mt-1">The water pipeline leak at Sector 4 has been fixed by the maintenance team.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-2xl border border-slate-100">
              <div className="h-10 w-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Complaint #E-102 In Progress</p>
                <p className="text-xs text-slate-500 mt-1">Electrical department has acknowledged your report regarding the street light.</p>
              </div>
            </div>
          </div>
          <Link 
            to="/citizen/history" 
            className="block text-center text-blue-600 text-sm font-bold mt-6 hover:underline"
          >
            View All History
          </Link>
        </div>
      </div>

      {/* Community map section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CommunityMap complaints={complaints} />
      </motion.div>

      <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Smart Community Intelligence Platform • Secure Session</span>
      </div>
    </div>
  );
}