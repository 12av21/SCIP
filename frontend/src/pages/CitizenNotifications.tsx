import { Bell, CheckCircle2, Clock, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const NOTIFICATIONS = [
  { id: "1", title: "Complaint Resolved", message: "Water leakage issue #W-882 has been verified as fixed by the maintenance team.", time: "2 hours ago", type: "success", link: "/citizen/complaint/w-882" },
  { id: "2", title: "Team Dispatched", message: "A repair crew has been dispatched to Sector 4 for your report #E-102.", time: "5 hours ago", type: "info", link: "/citizen/complaint/e-102" },
  { id: "3", title: "AI Analysis Complete", message: "Gemini AI has categorized your latest report and prioritized it as 'Medium'.", time: "1 day ago", type: "ai", link: "/citizen/complaint/g-991" },
  { id: "4", title: "Welcome to SCIP", message: "Your account is now active. You can start reporting community issues immediately.", time: "2 days ago", type: "info", link: "/citizen" },
];

export default function CitizenNotifications() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-slate-500 font-medium">Updates on your community reports</p>
        </div>
        <button className="text-xs font-black uppercase text-blue-600 hover:underline">Mark all as read</button>
      </header>

      <div className="space-y-4">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                n.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                n.type === 'ai' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
              }`}>
                {n.type === 'success' ? <CheckCircle2 size={24} /> : 
                 n.type === 'ai' ? <Bell size={24} className="animate-pulse" /> : <Info size={24} />}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900">{n.title}</h3>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{n.time}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">
                  {n.message}
                </p>
                <Link 
                  to={n.link}
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:gap-3 transition-all"
                >
                  View Details <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {NOTIFICATIONS.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-slate-900">No notifications yet</p>
          <p className="text-sm text-slate-400 mt-1">We'll notify you here when your reports are updated.</p>
        </div>
      )}
    </div>
  );
}