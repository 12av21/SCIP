import { useEffect, useState } from "react";
import api from "../utils/api";
import { FileText, ShieldCheck, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface ExecutiveReportData {
  totalComplaints: number;
  topCategory: string[];
  topArea: string[];
  insights: string[];
}

export default function ExecutiveReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);

  useEffect(() => {
    api.get("/community-analysis").then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="loading-state">Loading report…</div>;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display">Executive Intelligence</h1>
          <p className="opacity-60 text-sm">Automated summary for departmental leadership.</p>
        </div>
        <div className="landing-tag">Confidential / Internal</div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="stamp-card section-gap relative overflow-hidden" 
        style={{ padding: 32 }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck size={120} />
        </div>
        
        <span className="stamp-id">REF: SCIP-REPORT-{today.replace(/ /g, '-').toUpperCase()}</span>
        <span className="stamp-seal" style={{ color: "var(--brass)", border: "2px solid var(--brass)", borderRadius: "8px", padding: "2px 8px", fontSize: "10px", textTransform: "uppercase", fontWeight: "bold" }}>
          Verified by Gemini
        </span>

        <div style={{ marginTop: 22 }}>
          <h2 className="text-xl mb-6 flex items-center gap-2"><FileText size={20} className="text-brass" /> Case-Load Summary</h2>
          <div className="stat-line border-b border-ink/5 py-3">
            <span className="stat-line-label">Total complaints</span>
            <span className="stat-line-value font-mono font-bold text-lg">{data.totalComplaints}</span>
          </div>
          <div className="stat-line border-b border-ink/5 py-3">
            <span className="stat-line-label">Primary Infrastructure Risk</span>
            <span className="stat-line-value font-mono font-bold text-lg">{data.topCategory?.[0]}</span>
          </div>
          <div className="stat-line border-b border-ink/5 py-3">
            <span className="stat-line-label">Critical Hotspot</span>
            <span className="stat-line-value font-mono font-bold text-lg">{data.topArea?.[0]}</span>
          </div>

          <h2 style={{ marginTop: 40, marginBottom: 16 }} className="text-xl flex items-center gap-2"><TrendingDown size={20} className="text-brass" /> Strategic Recommendations</h2>
          <div className="insight-list space-y-3">
            {data.insights.map((item, index) => (
              <div className="insight-list-item bg-brass-bg p-4 rounded-xl border border-brass-border text-sm italic" key={index}>
                " {item} "
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}
