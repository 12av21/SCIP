import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

import PageHeader from "../components/PageHeader";
import api from "../utils/api"; // Import the centralized API client
import KpiCard from "../components/KpiCard";
import AIInsights from "../components/AIInsights";
import RecentComplaints from "../components/RecentComplaints";
import ComplaintChart from "../components/ComplaintChart";

import { ClipboardList, Clock3, CheckCircle2, MapPinned } from "lucide-react";

interface Complaint {
  id: string;
  title: string;
  location: string;
  status: string;
  lat?: number;
  lng?: number;
}

interface DashboardData {
  total: number;
  pending: number;
  resolved: number;
  inProgress: number;
  areas: number;
  recent: Complaint[];
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!dashboard) {
    return <div className="loading-state">Loading dashboard…</div>;
  }

  return (
    <>
      <PageHeader />

      <div className="grid-4">
        <KpiCard
          title="Total complaints"
          value={dashboard.total}
          icon={<ClipboardList size={20} />}
          tone="ink"
        />
        <KpiCard
          title="Pending"
          value={dashboard.pending}
          icon={<Clock3 size={20} />}
          tone="brass"
        />
        <KpiCard
          title="Resolved"
          value={dashboard.resolved}
          icon={<CheckCircle2 size={20} />}
          tone="good"
        />
        <KpiCard
          title="Areas covered"
          value={dashboard.areas}
          icon={<MapPinned size={20} />}
          tone="alert"
        />
      </div>

      <div className="grid-2 section-gap">
        <ComplaintChart />
        <AIInsights
          insights={[
            `${dashboard.pending} complaints require immediate attention.`,
            `${dashboard.areas} locations are currently monitored.`,
            "AI recommends prioritizing Water and Road complaints.",
          ]}
        />
      </div>
      <div className="section-gap">
        <RecentComplaints complaints={dashboard.recent} />
      </div>
    </>

  );
}
