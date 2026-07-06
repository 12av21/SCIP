import { useEffect, useState } from "react";
import api from "../utils/api";

interface RecommendationsData {
  recommendations: string[];
}

export default function Recommendations() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  
  useEffect(() => { //
    api.get("/recommendations").then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="loading-state">Loading recommendations…</div>;

  return (
    <>
      <h1>AI recommendations</h1>
      <p>Suggested next steps based on current complaint and risk data.</p>

      <div className="card section-gap" style={{ padding: 24 }}>
        <div className="insight-list">
          {data.recommendations.map((item, index) => (
            <p className="insight-list-item" key={index}>
              {item}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
