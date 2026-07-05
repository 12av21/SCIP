import { Sparkles, TriangleAlert, Droplets, TrendingUp } from "lucide-react";
import "./AIInsights.css";

interface Props {
  insights: string[];
}

const ROWS = [
  { Icon: TriangleAlert, tone: "alert" },
  { Icon: Droplets, tone: "brass" },
  { Icon: TrendingUp, tone: "good" },
];

export default function AIInsights({ insights }: Props) {
  return (
    <div className="card ai-insights">
      <div className="ai-insights-head">
        <Sparkles size={18} className="ai-insights-mark" />
        <h2>AI insights</h2>
      </div>

      <div className="ai-insights-list">
        {ROWS.map(({ Icon, tone }, i) =>
          insights[i] ? (
            <div className="ai-insight-row" key={i}>
              <span className={`ai-insight-icon ai-insight-${tone}`}>
                <Icon size={16} strokeWidth={2} />
              </span>
              <p>{insights[i]}</p>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
