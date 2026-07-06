import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./RiskChart.css";

interface RiskPoint {
  period: string;
  riskScore: number;
}

interface Props {
  data?: RiskPoint[];
}

const DEFAULT_DATA: RiskPoint[] = [
  { period: "Jan", riskScore: 32 },
  { period: "Feb", riskScore: 38 },
  { period: "Mar", riskScore: 35 },
  { period: "Apr", riskScore: 47 },
  { period: "May", riskScore: 55 },
  { period: "Jun", riskScore: 49 },
];

export default function RiskChart({ data = DEFAULT_DATA }: Props) {
  return (
    <div className="card risk-chart">
      <div className="risk-chart-head">
        <h2>Community risk index</h2>
        <p>Composite risk score over time</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ left: -12 }}>
          <defs>
            <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b4432e" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#b4432e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1dfd8" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: "#667085", fontSize: 12 }}
            axisLine={{ stroke: "#e1dfd8" }}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e1dfd8",
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
            }}
          />
          <Area
            type="monotone"
            dataKey="riskScore"
            stroke="#b4432e"
            strokeWidth={2}
            fill="url(#riskFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
