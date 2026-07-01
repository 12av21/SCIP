import { useEffect, useState } from "react";
import axios from "axios";

export default function AreaRanking() {
  const [areas, setAreas] =
    useState<any[]>([]);

  useEffect(() => {
    axios
      .get("/api/risk")
      .then((res) =>
        setAreas(
          [...res.data].sort(
            (a, b) =>
              b.riskScore -
              a.riskScore
          )
        )
      );
  }, []);

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Area Rankings
      </h1>

      <div className="bg-white rounded shadow p-6">

        {areas.map(
          (area, index) => (
            <div
              key={area.area}
              className="flex justify-between border-b py-3"
            >
              <span>
                #{index + 1}
                {" "}
                {area.area}
              </span>

              <span>
                {area.riskScore}
              </span>
            </div>
          )
        )}

      </div>

    </div>
  );
}