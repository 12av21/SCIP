import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
  priority: {
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

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await axios.get("/api/complaints");
      setComplaints(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load complaints.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/complaints/${id}/status`, { status });
      toast.success(`Marked as ${status}`);
      fetchComplaints();
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
  });

  return (
    <>
      <h1>Community complaints</h1>
      <p>{filteredComplaints.length} of {complaints.length} cases shown</p>

      <div className="toolbar section-gap">
        <input
          placeholder="Search by title or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field"
          style={{ width: 280 }}
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

      <div className="form-stack">
        {filteredComplaints.map((complaint) => (
          <div key={complaint.id} className="stamp-card" style={{ padding: 22 }}>
            <span className="stamp-id">
              CASE {complaint.id.slice(0, 8).toUpperCase()} · {new Date(complaint.createdAt).toLocaleDateString()}
            </span>

            <div style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: 19 }}>{complaint.title}</h2>
              <p style={{ marginTop: 8 }}>{complaint.description}</p>

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <span className="tag">{complaint.category}</span>
                <span className="tag">{complaint.location}</span>
                <StatusBadge status={complaint.status} />
                <PriorityBadge level={complaint.priority.level} score={complaint.priority.score} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(complaint.id, status)}
                    className={
                      "btn-status" +
                      (complaint.status === status
                        ? status === "Pending"
                          ? " is-active-pending"
                          : status === "In Progress"
                          ? " is-active-progress"
                          : " is-active-resolved"
                        : "")
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredComplaints.length === 0 && (
          <p className="loading-state">No complaints match these filters.</p>
        )}
      </div>
    </>
  );
}
