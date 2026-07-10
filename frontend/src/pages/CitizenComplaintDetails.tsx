import { useState, useEffect } from "react";
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
import api from "../utils/api";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Setup Leaflet marker overrides
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function CitizenComplaintDetails() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const res = await api.get(`/complaints/${id}`);
        setComplaint(res.data);
      } catch (error) {
        toast.error("Failed to load complaint data.");
      } finally {
        setLoading(false);
      }
    };
    fetchComplaint();
  }, [id]);

  const handleRate = () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setIsSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500 font-medium">
        <p className="animate-pulse">Loading case tracking metrics...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h2 className="font-bold text-slate-800 text-lg">Complaint Not Found</h2>
        <p className="text-slate-400 text-sm">The complaint ID does not exist or has been deleted.</p>
        <Link to="/citizen/history" className="inline-block bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:scale-[1.02] transition-transform">
          Back to History
        </Link>
      </div>
    );
  }

  // Derive dynamic progress steps
  const isPending = complaint.status === "Pending";
  const isInProgress = complaint.status === "In Progress" || complaint.status === "Acknowledged";
  const isResolved = complaint.status === "Resolved";

  const submittedTimeStr = new Date(complaint.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + 
    ", " + new Date(complaint.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const steps = [
    { id: 1, title: "Report Submitted", desc: "Successfully received by SCIP platform", time: submittedTimeStr, status: "complete" },
    { id: 2, title: "AI Categorized", desc: `Gemini AI sorted priority and department: ${complaint.category}`, time: submittedTimeStr, status: "complete" },
    { id: 3, title: "Authority Acknowledged", desc: "Assigned to department dispatch team", time: isPending ? "" : submittedTimeStr, status: isPending ? "current" : "complete" },
    { id: 4, title: "Team Dispatched", desc: "Maintenance crew routing to coordinate", time: "", status: isPending ? "pending" : isInProgress ? "current" : "complete" },
    { id: 5, title: "Issue Resolved", desc: "Final verification complete and resolved", time: "", status: isResolved ? "complete" : "pending" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-body">
      <div className="flex items-center gap-4">
        <Link to="/citizen/history" className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm border border-slate-100 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Case Tracking</h1>
          <p className="text-xs font-bold text-slate-400">CASE ID: {id?.toUpperCase()}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Summary Cards */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
              isResolved ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {isResolved ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            <h2 className="font-bold text-lg text-slate-900 mb-2">{complaint.title}</h2>
            <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-3">{complaint.description}</p>
            <div className="space-y-4 mt-6 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <span className="text-xs font-semibold">{complaint.location}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Sparkles size={16} className="text-cyan-500 shrink-0" />
                <span className="text-xs font-bold text-cyan-600">Department: {complaint.category}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <span className="text-xs font-medium italic underline underline-offset-4 decoration-blue-100">
                  Status: {complaint.status}
                </span>
              </div>
            </div>
          </div>

          {/* Pinpoint Location Map */}
          {complaint.lat && complaint.lng && (
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 overflow-hidden space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Pinpoint Location</h3>
              <div className="h-[180px] border border-slate-150 rounded-2xl overflow-hidden relative z-0">
                <MapContainer center={[complaint.lat, complaint.lng]} zoom={14} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[complaint.lat, complaint.lng]} />
                </MapContainer>
              </div>
              <p className="text-[10px] text-slate-450 font-mono tracking-wide text-center">
                LAT: {complaint.lat.toFixed(5)}, LNG: {complaint.lng.toFixed(5)}
              </p>
            </div>
          )}

          <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative">
             <ShieldCheck size={80} className="absolute -right-4 -bottom-4 opacity-10" />
             <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
               <ShieldCheck size={16} className="text-blue-400" />
               Citizen Guarantee
             </h3>
             <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
               Your report is monitored by the SCIP Oversight system. Inefficiencies are flagged for secondary agency review.
             </p>
          </div>
        </div>

        {/* Right: Timeline View & Feedback */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-8">Resolution Progress</h3>
            
            <div className="space-y-0 relative">
              {/* The Vertical Line */}
              <div className="absolute left-[15px] top-2 bottom-8 w-0.5 bg-slate-100"></div>

              {steps.map((step, idx) => (
                <div key={idx} className="relative pl-12 pb-10 last:pb-0">
                  {/* Dot */}
                  <div className={`absolute left-0 h-8 w-8 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm transition-all ${
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
                    <p className={`text-xs mt-1 ${step.status === 'pending' ? 'text-slate-350' : 'text-slate-500 font-medium'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Section (Enabled always for test, rating active if resolved) */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-5">Rate Service Quality</h3>
            
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
                  placeholder="How was your experience with this civic request?"
                  className="w-full bg-slate-55 border border-slate-200 rounded-2xl p-4 outline-none focus:bg-white focus:border-blue-600 transition-all text-sm font-medium placeholder:text-slate-400 resize-none"
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
                <p className="text-xs text-slate-500 mt-1">Your rating helps us evaluate service department response latency.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}