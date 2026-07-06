import { motion } from "framer-motion";
import { 
  Users, 
  Zap, 
  Droplets, 
  Construction, 
  Trash2, 
  AlertTriangle,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

const DEPARTMENTS = [
  { name: "Water & Sewage", activeTeams: 8, load: 85, icon: Droplets, color: "text-blue-500", bg: "bg-blue-50" },
  { name: "Electrical Dept.", activeTeams: 5, load: 42, icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
  { name: "Public Works (Roads)", activeTeams: 12, load: 92, icon: Construction, color: "text-orange-500", bg: "bg-orange-50" },
  { name: "Waste Management", activeTeams: 15, load: 60, icon: Trash2, color: "text-emerald-500", bg: "bg-emerald-50" },
];

const AI_SUGGESTIONS = [
  { area: "Kakori", reason: "High Risk Index (88)", action: "Deploy 2 Water Maintenance Teams", priority: "Critical" },
  { area: "Sector 4", reason: "Infrastructure Cluster", action: "Move 1 Road Repair Team from Sector 1", priority: "High" },
];

export default function ResourceAllocation() {
  const handleDeploy = (team: string) => {
    toast.success(`Action Initiated: ${team} deployment sequence started.`);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Resource Allocation</h1>
        <p className="text-slate-500 font-medium">Manage departmental deployments and AI-suggested dispatching.</p>
      </header>

      {/* Department Load Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DEPARTMENTS.map((dept) => (
          <div key={dept.name} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className={`h-12 w-12 ${dept.bg} ${dept.color} rounded-2xl flex items-center justify-center mb-4`}>
              <dept.icon size={24} />
            </div>
            <h3 className="font-bold text-slate-900">{dept.name}</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>System Load</span>
                <span className={dept.load > 80 ? "text-red-500" : "text-slate-600"}>{dept.load}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dept.load}%` }}
                  className={`h-full ${dept.load > 80 ? "bg-red-500" : "bg-blue-600"}`}
                />
              </div>
              <p className="text-sm text-slate-500 pt-2 font-medium">{dept.activeTeams} teams currently active</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* AI Deployment Suggestions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Users size={120} /></div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <CheckCircle2 className="text-cyan-400" />
              Gemini Deployment Insights
            </h2>
            <div className="space-y-4">
              {AI_SUGGESTIONS.map((sug, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/10 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${sug.priority === 'Critical' ? 'bg-red-500 text-white' : 'bg-cyan-500 text-slate-900'}`}>
                        {sug.priority}
                      </span>
                      <span className="text-cyan-400 font-bold">{sug.area}</span>
                    </div>
                    <p className="font-bold text-lg">{sug.action}</p>
                    <p className="text-sm text-slate-400">Reason: {sug.reason}</p>
                  </div>
                  <button 
                    onClick={() => handleDeploy(sug.action)}
                    className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-cyan-400 hover:text-slate-900 transition-all shrink-0"
                  >
                    Authorize <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 text-xl mb-6">Active Forces</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600"><Users size={20} /></div>
                <div>
                  <p className="text-2xl font-black text-slate-900">40/52</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Ground Teams</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}