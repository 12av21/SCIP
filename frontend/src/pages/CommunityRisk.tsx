import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AlertTriangle, Map } from "lucide-react";
import { motion } from "framer-motion";
 
interface AreaRiskRow {
  area: string;
  complaints: number;
  pending: number;
  riskScore: number;
  level: string;
}

const LEVEL_CLASS: Record<string, string> = {
  Low: "badge badge-resolved",
  Medium: "badge badge-pending",
  High: "badge badge-risk",
  Critical: "badge badge-critical",
};

interface AreaRiskRow {
  area: string;
  complaints: number;
  pending: number;
  riskScore: number;
  level: string;
}

const LEVEL_CLASS: Record<string, string> = {
  Low: "badge badge-resolved",
  Medium: "badge badge-pending",
  High: "badge badge-risk",
  Critical: "badge badge-critical",
};

export default function CommunityRisk() {
  const [data, setData] = useState<AreaRiskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get("/api/risk")
      .then((res) => setData(res.data))
      .catch(() => toast.error("Risk assessment sync failed."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display">Area Risk Assessment</h1>
          <p className="opacity-60 text-sm italic">Weighted composite scores identifying critical community needs.</p>
        </div>
        <div className="bg-ink text-paper px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" /> LIVE MONITORING
        </div>
      </div>

      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="stamp-card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="bg-ink/5 p-4 border-b border-ink/10 flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-60">
          <Map size={14} /> Regional Ledger
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Complaints</th>
              <th>Pending</th>
              <th>Risk score</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.area}>
                <td>{item.area}</td>
                <td className="font-mono text-center">{item.complaints}</td>
                <td className="font-mono text-center">{item.pending}</td>
                <td className="font-mono text-center font-bold">{item.riskScore}</td>
                <td>
                  <span className={LEVEL_CLASS[item.level] ?? "badge badge-progress"}>
                    {item.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && data.length === 0 && <p className="loading-state">No risk data yet.</p>}
      </motion.div>
    </>
  );
}
