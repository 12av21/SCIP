import { useEffect, useState } from "react";
import axios from "axios";

export default function CommunityRisk() {
  const [data, setData] =
    useState<any[]>([]);

  useEffect(() => {
    axios
      .get("/api/risk")
      .then((res) =>
        setData(res.data)
      );
  }, []);

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Community Risk Scores
      </h1>

      <table className="w-full bg-white rounded shadow">

        <thead>
          <tr>
            <th>Area</th>
            <th>Complaints</th>
            <th>Pending</th>
            <th>Risk Score</th>
            <th>Level</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr
              key={item.area}
            >
              <td>{item.area}</td>
              <td>
                {item.complaints}
              </td>
              <td>
                {item.pending}
              </td>
              <td>
                {item.riskScore}
              </td>
              <td>
                {item.level}
              </td>
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}