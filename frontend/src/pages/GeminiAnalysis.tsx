import { useEffect, useState } from "react";
import axios from "axios";

export default function GeminiAnalysis() {
  const [analysis, setAnalysis] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    axios
      .get("/api/gemini-analysis")
      .then((res) => {
        setAnalysis(
          res.data.analysis
        );

        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        AI Community Analysis
      </h1>

      <div className="bg-white p-6 rounded shadow">

        {loading
          ? "Generating Analysis..."
          : (
            <pre className="whitespace-pre-wrap">
              {analysis}
            </pre>
          )}

      </div>

    </div>
  );
}