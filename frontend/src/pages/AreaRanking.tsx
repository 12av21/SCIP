import { useEffect, useState } from "react";
import api from "../utils/api"; // Use centralized API client

interface AreaRisk {
  area: string;
  riskScore: number;
}

export default function AreaRanking() {
  const [areas, setAreas] = useState<AreaRisk[]>([]);

  useEffect(() => {
    api
      .get("/risk")
      .then((res) => setAreas([...res.data].sort((a, b) => b.riskScore - a.riskScore)));
  }, []);

  return (
    <>
      <h1>Area rankings</h1>
      <p>Areas ordered by composite risk score, highest first.</p>

      <div className="card section-gap" style={{ padding: 22 }}>
        {areas.map((area, index) => (
          <div key={area.area} className="rank-row">
            <span className="rank-index mono">#{index + 1}</span>
            <span className="rank-name">{area.area}</span>
            <span className="rank-score mono">{area.riskScore}</span>
          </div>
        ))}

        {areas.length === 0 && <p className="loading-state">No area risk data yet.</p>}
      </div>
    </>
  );
}
