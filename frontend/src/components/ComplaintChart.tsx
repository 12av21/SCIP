import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./ComplaintChart.css";

const data = [
  { month: "Jan", complaints: 12 },
  { month: "Feb", complaints: 18 },
  { month: "Mar", complaints: 15 },
  { month: "Apr", complaints: 22 },
  { month: "May", complaints: 30 },
  { month: "Jun", complaints: 28 },
];

export default function ComplaintChart() {
  return (
    <div className="card complaint-chart">
      <div className="complaint-chart-head">
        <h2>Complaint trends</h2>
        <p>Filed cases per month</p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1dfd8" vertical={false} />
          <XAxis
            dataKey="month"
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
          <Bar dataKey="complaints" radius={[6, 6, 0, 0]} fill="#9c6b1f" maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
