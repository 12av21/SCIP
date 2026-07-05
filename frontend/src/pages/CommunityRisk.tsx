import { useEffect, useState } from "react";
import axios from "axios";

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

  useEffect(() => {
    axios.get("/api/risk").then((res) => setData(res.data));
  }, []);

  return (
    <>
      <h1>Community risk scores</h1>
      <p>Complaint volume and pending load, weighted into a risk score per area.</p>

      <div className="card section-gap" style={{ padding: 22 }}>
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
                <td className="mono">{item.complaints}</td>
                <td className="mono">{item.pending}</td>
                <td className="mono">{item.riskScore}</td>
                <td>
                  <span className={LEVEL_CLASS[item.level] ?? "badge badge-progress"}>
                    {item.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && <p className="loading-state">No risk data yet.</p>}
      </div>
    </>
  );
}
