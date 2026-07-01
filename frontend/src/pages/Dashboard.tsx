import { useEffect, useState } from "react";
import axios from "axios";

import DashboardLayout from "../layouts/DashboardLayout";

import PageHeader from "../components/PageHeader";
import KpiCard from "../components/KpiCard";
import AIInsights from "../components/AIInsights";
import RecentComplaints from "../components/RecentComplaints";
import ComplaintChart from "../components/ComplaintChart";

import {
  ClipboardList,
  Clock3,
  CheckCircle2,
  MapPinned,
} from "lucide-react";

interface Complaint {
  id: string;
  title: string;
  location: string;
  status: string;
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
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await axios.get("/api/dashboard");
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!dashboard) {
    return (
      <DashboardLayout>
        <div className="text-xl font-semibold">
          Loading Dashboard...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>

      <PageHeader />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <KpiCard
          title="Total Complaints"
          value={dashboard.total}
          icon={<ClipboardList className="text-blue-600" />}
          color="text-blue-600"
        />

        <KpiCard
          title="Pending"
          value={dashboard.pending}
          icon={<Clock3 className="text-yellow-500" />}
          color="text-yellow-500"
        />

        <KpiCard
          title="Resolved"
          value={dashboard.resolved}
          icon={<CheckCircle2 className="text-green-600" />}
          color="text-green-600"
        />

        <KpiCard
          title="Areas Covered"
          value={dashboard.areas}
          icon={<MapPinned className="text-red-600" />}
          color="text-red-600"
        />

      </div>

      <div className="grid xl:grid-cols-2 gap-6 mt-8">

        <ComplaintChart />

        <AIInsights
          insights={[
            `${dashboard.pending} complaints require immediate attention.`,
            `${dashboard.areas} locations are currently monitored.`,
            "AI recommends prioritizing Water and Road complaints.",
          ]}
        />

      </div>

      <div className="mt-8">

        <RecentComplaints
          complaints={dashboard.recent}
        />

      </div>

    </DashboardLayout>
  );
}