import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">

      <div className="flex justify-between items-center mb-6">

        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Complaint Trends
          </h2>

          <p className="text-slate-500">
            Monthly complaint overview
          </p>
        </div>

      </div>

      <ResponsiveContainer
        width="100%"
        height={350}
      >
        <BarChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="complaints"
            radius={[8, 8, 0, 0]}
            fill="#2563eb"
          />

        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}