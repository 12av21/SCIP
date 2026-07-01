import {
  Sparkles,
  TriangleAlert,
  Droplets,
  TrendingUp,
} from "lucide-react";

interface Props {
  insights: string[];
}

export default function AIInsights({
  insights,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">

      <div className="flex items-center gap-3 mb-6">

        <Sparkles className="text-blue-600" />

        <h2 className="text-xl font-bold">
          AI Insights
        </h2>

      </div>

      <div className="space-y-4">

        <div className="flex gap-3">

          <TriangleAlert className="text-red-500 mt-1" />

          <p>
            {insights[0]}
          </p>

        </div>

        <div className="flex gap-3">

          <Droplets className="text-blue-500 mt-1" />

          <p>
            {insights[1]}
          </p>

        </div>

        <div className="flex gap-3">

          <TrendingUp className="text-green-600 mt-1" />

          <p>
            {insights[2]}
          </p>

        </div>

      </div>

    </div>
  );
}