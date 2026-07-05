import { useEffect, useState } from "react";
import axios from "axios";

interface ExecutiveReportData {
  totalComplaints: number;
  topCategory: string[];
  topArea: string[];
  insights: string[];
}

export default function ExecutiveReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);

  useEffect(() => {
    axios.get("/api/community-analysis").then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="loading-state">Loading report…</div>;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <h1>Executive community report</h1>
      <p>A summary suitable for leadership review, generated from live case data.</p>

      <div className="stamp-card section-gap" style={{ padding: 26 }}>
        <span className="stamp-id">REPORT · {today}</span>
        <span className="stamp-seal" style={{ color: "var(--brass)" }}>
          Official
        </span>

        <div style={{ marginTop: 22 }}>
          <h2>Summary</h2>
          <div className="stat-line">
            <span className="stat-line-label">Total complaints</span>
            <span className="stat-line-value">{data.totalComplaints}</span>
          </div>
          <div className="stat-line">
            <span className="stat-line-label">Top issue</span>
            <span className="stat-line-value">{data.topCategory?.[0]}</span>
          </div>
          <div className="stat-line">
            <span className="stat-line-label">Most affected area</span>
            <span className="stat-line-value">{data.topArea?.[0]}</span>
          </div>

          <h2 style={{ marginTop: 24 }}>Recommended actions</h2>
          <div className="insight-list">
            {data.insights.map((item, index) => (
              <p className="insight-list-item" key={index}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
