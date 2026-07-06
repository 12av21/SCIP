import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Sparkles,
  Hammer,
  AlertCircle,
  Star
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, title: "Report Submitted", desc: "Successfully received by SCIP platform", time: "Oct 24, 10:00 AM", status: "complete" },
  { id: 2, title: "AI Categorized", desc: "Gemini AI identified: Water Infrastructure", time: "Oct 24, 10:02 AM", status: "complete" },
  { id: 3, title: "Authority Acknowledged", desc: "Assigned to Water Maintenance Dept", time: "Oct 24, 02:30 PM", status: "current" },
  { id: 4, title: "Team Dispatched", desc: "Maintenance crew heading to site", time: "Oct 25, 09:15 AM", status: "complete" },
  { id: 5, title: "Issue Resolved", desc: "Final verification and image update", time: "Oct 25, 11:45 AM", status: "complete" },
];

export default function CitizenComplaintDetails() {
  const { id } = useParams();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRate = () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setIsSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/citizen/history" className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm border border-slate-100 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Case Tracking</h1>
          <p className="text-sm font-bold text-slate-400">ID: {id?.toUpperCase()}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="font-bold text-lg text-slate-900 mb-2">Water Leakage in Sector 4</h2>
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-3 text-slate-500">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-xs font-medium">Lutyens' Delhi Area</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Sparkles size={16} className="text-cyan-500" />
                <span className="text-xs font-bold text-cyan-600">AI Priority: High</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Clock size={16} className="text-slate-400" />
                <span className="text-xs font-medium italic underline underline-offset-4 decoration-blue-100">Est. 24h to Resolve</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative">
             <ShieldCheck size={80} className="absolute -right-4 -bottom-4 opacity-10" />
             <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
               <ShieldCheck size={16} className="text-blue-400" />
               Citizen Guarantee
             </h3>
             <p className="text-[11px] text-slate-400 leading-relaxed">
               Your report is being monitored by the SCIP Oversight AI to ensure department accountability.
             </p>
          </div>
        </div>

        {/* Right: Timeline View */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-bold text-slate-900 mb-8">Resolution Progress</h3>
            
            <div className="space-y-0 relative">
              {/* The Vertical Line */}
              <div className="absolute left-[15px] top-2 bottom-8 w-0.5 bg-slate-100"></div>

              {STEPS.map((step, idx) => (
                <div key={idx} className="relative pl-12 pb-10 last:pb-0">
                  {/* Dot */}
                  <div className={`absolute left-0 h-8 w-8 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${
                    step.status === 'complete' ? 'bg-emerald-500 text-white' : 
                    step.status === 'current' ? 'bg-blue-600 text-white animate-pulse' : 
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {step.status === 'complete' ? <CheckCircle2 size={14} /> : 
                     step.status === 'current' ? <Hammer size={14} /> : 
                     <div className="h-2 w-2 bg-slate-300 rounded-full" />}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h4 className={`text-sm font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                        {step.title}
                      </h4>
                      {step.time && <span className="text-[10px] font-black uppercase text-slate-400">{step.time}</span>}
                    </div>
                    <p className={`text-xs mt-1 ${step.status === 'pending' ? 'text-slate-300' : 'text-slate-500 font-medium'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Section (Visible only when resolved) */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6">Rate Service Quality</h3>
            
            {!isSubmitted ? (
              <div className="space-y-6">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star 
                        size={32} 
                        className={`${
                          star <= (hoveredRating || rating) 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-slate-200"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="How was your experience with the resolution process?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:bg-white focus:border-blue-600 transition-all text-sm font-medium placeholder:text-slate-400"
                  rows={3}
                />

                <button
                  onClick={handleRate}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
                >
                  Submit Feedback
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} />
                </div>
                <p className="font-bold text-slate-900">Feedback Submitted</p>
                <p className="text-sm text-slate-500 mt-1">Your response helps us improve public services.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}