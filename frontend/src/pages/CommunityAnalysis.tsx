import { useEffect, useState } from "react";
import axios from "axios";

interface CommunityAnalysisData {
  totalComplaints: number;
  topCategory: string[];
  topArea: string[];
  insights: string[];
}

export default function CommunityAnalysis() {
  const [data, setData] = useState<CommunityAnalysisData | null>(null);

  useEffect(() => {
    axios.get("/api/community-analysis").then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="loading-state">Loading community analysis…</div>;

  return (
    <>
      <h1>Community intelligence report</h1>
      <p>A rolled-up view of what's driving complaint volume right now.</p>

      <div className="card section-gap" style={{ padding: 24 }}>
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

        <h2 style={{ marginTop: 24, marginBottom: 12 }}>Insights</h2>
        <div className="insight-list">
          {data.insights.map((item, index) => (
            <p className="insight-list-item" key={index}>
              {item}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
