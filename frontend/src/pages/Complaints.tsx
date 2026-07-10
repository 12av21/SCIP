import { useEffect, useState } from "react";
import api from "../utils/api"; // Use centralized API client
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { useAuth } from "../context/AuthContext";
import CommunityMap from "../components/CommunityMap";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
  lat?: number;
  lng?: number;
  priority?: {
    score: number;
    level: string;
  };
}

const STATUS_OPTIONS = ["Pending", "In Progress", "Resolved"];

export default function Complaints() {
  const [search, setSearch] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await api.get("/complaints");
      setComplaints(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load complaints.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status });
      toast.success(`Marked as ${status}`);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (error) {
      console.error(error);
      toast.error("Couldn't update status.");
    }
  };

  const filteredComplaints = complaints.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    const scoreA = a.priority?.score || 0;
    const scoreB = b.priority?.score || 0;
    return scoreB - scoreA;
  });

  // Helper function for status button classes
  const getStatusButtonClass = (currentStatus: string, buttonStatus: string) => {
    let classes = "btn-status";
    if (currentStatus === buttonStatus) {
      if (buttonStatus === "Pending") classes += " is-active-pending";
      else if (buttonStatus === "In Progress") classes += " is-active-progress";
      else if (buttonStatus === "Resolved") classes += " is-active-resolved";
    }
    return classes;
  };

  return (
    <>
      <h1>Community complaints</h1>
      <p>
        {loading ? (
          "Syncing cases..."
        ) : (
          `${filteredComplaints.length} of ${complaints.length} cases shown`
        )}
      </p>

      <div className="toolbar section-gap">
        <input
          placeholder="Search by title or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field w-72" // Use Tailwind class for width
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="field"
        >
          <option>All</option>
          <option>Water</option>
          <option>Electricity</option>
          <option>Road</option>
          <option>Waste</option>
          <option>Health</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field"
        >
          <option>All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>
      </div>

      {!loading && filteredComplaints.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <CommunityMap complaints={filteredComplaints} />
        </div>
      )}

      <div className="form-stack">
        {filteredComplaints.map((complaint) => (
          <div key={complaint.id} className="stamp-card p-5"> {/* Use Tailwind class for padding */}
            <span className="stamp-id">
              CASE {complaint.id.slice(0, 8).toUpperCase()} · {new Date(complaint.createdAt).toLocaleDateString()}
            </span>

            <div className="mt-5"> {/* Use Tailwind class for margin-top */}
              <h2 className="text-lg">{complaint.title}</h2> {/* Use Tailwind class for font-size */}
              <p className="mt-2">{complaint.description}</p> {/* Use Tailwind class for margin-top */}

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                <span className="tag">{complaint.category}</span>
                <span className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={12} className="text-slate-400" />
                  <span>{complaint.location}</span>
                  {complaint.lat && complaint.lng && (
                    <span style={{ fontSize: "10px", opacity: 0.6, fontFamily: "monospace" }}>
                      ({complaint.lat.toFixed(4)}, {complaint.lng.toFixed(4)})
                    </span>
                  )}
                </span>
                <StatusBadge status={complaint.status} />
                {complaint.priority ? (
                  <PriorityBadge level={complaint.priority.level} score={complaint.priority.score} />
                ) : (
                  <span className="tag italic opacity-60">AI Analysis in progress...</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
                {!isAdmin && (
                  <button 
                    onClick={() => navigate(`/citizen/complaint/${complaint.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Track Progress <ArrowRight size={14} />
                  </button>
                )}

                {isAdmin && STATUS_OPTIONS.map((status) => (

                  <button
                    key={status} //
                    onClick={() => updateStatus(complaint.id, status)} //
                    className={getStatusButtonClass(complaint.status, status)} //
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredComplaints.length === 0 && (
          <p className="loading-state">No complaints match these filters.</p>
        )}
        
      </div>
    </>
  );
}
