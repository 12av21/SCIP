import { useEffect, useState } from "react";
import axios from "axios";

export default function Recommendations() {
  const [data, setData] =
    useState<any>(null);

  useEffect(() => {
    axios
      .get(
        "/api/recommendations"
      )
      .then((res) =>
        setData(res.data)
      );
  }, []);

  if (!data)
    return <div>Loading...</div>;

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        AI Recommendations
      </h1>

      <div className="bg-white rounded shadow p-6">

        <ul>
          {data.recommendations.map(
            (
              item: string,
              index: number
            ) => (
              <li
                key={index}
                className="mb-3"
              >
                • {item}
              </li>
            )
          )}
        </ul>

      </div>

    </div>
  );
}