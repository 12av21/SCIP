import { useEffect, useState } from "react";
import axios from "axios";

export default function CommunityAnalysis() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios
      .get("/api/community-analysis")
      .then((res) => setData(res.data));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Community Intelligence Report
      </h1>

      <div className="bg-white p-6 rounded shadow">

        <p>
          Total Complaints:
          {" "}
          {data.totalComplaints}
        </p>

        <p>
          Top Issue:
          {" "}
          {data.topCategory?.[0]}
        </p>

        <p>
          Most Affected Area:
          {" "}
          {data.topArea?.[0]}
        </p>

        <div className="mt-6">
          <h2 className="font-bold mb-2">
            Insights
          </h2>

          {data.insights.map(
            (item: string, index: number) => (
              <p key={index}>
                • {item}
              </p>
            )
          )}
        </div>

      </div>
    </div>
  );
}