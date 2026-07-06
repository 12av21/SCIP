import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#9c6b1f", "#10182a", "#2f6f5e", "#b4432e", "#667085"];

interface Complaint {
  category: string;
}

interface CategoryDatum {
  name: string;
  value: number;
}

export default function Analytics() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get("/api/complaints")
      .then((res) => setComplaints(res.data))
      .catch(() => toast.error("Analytics data sync failed."))
      .finally(() => setLoading(false));
  }, []);

  const categoryMap: Record<string, number> = {};
  complaints.forEach((item) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
  });

  const categoryData: CategoryDatum[] = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <>
      <h1>Analytics</h1>
      <p>How filed complaints break down by category.</p>

      <div className="grid-2 section-gap">
        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Complaints by category</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100}>
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e1dfd8", fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Category comparison</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1dfd8" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#667085", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e1dfd8", fontSize: 13 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#9c6b1f" maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!loading && categoryData.length === 0 && <p className="loading-state">No complaint data yet.</p>}
    </>
  );
}
