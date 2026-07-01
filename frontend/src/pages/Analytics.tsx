import { useEffect, useState } from "react";
import axios from "axios";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
];

export default function Analytics() {
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get("/api/complaints")
      .then((res) => setComplaints(res.data));
  }, []);

  const categoryMap: Record<string, number> = {};

  complaints.forEach((item) => {
    categoryMap[item.category] =
      (categoryMap[item.category] || 0) + 1;
  });

  const categoryData = Object.entries(
    categoryMap
  ).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Analytics Dashboard
      </h1>

      <div className="grid md:grid-cols-2 gap-8">

        <div className="bg-white p-6 rounded shadow">

          <h2 className="font-bold mb-4">
            Complaints by Category
          </h2>

          <PieChart width={400} height={300}>
            <Pie
              data={categoryData}
              dataKey="value"
              outerRadius={100}
            >
              {categoryData.map(
                (_, index) => (
                  <Cell
                    key={index}
                    fill={
                      COLORS[
                        index %
                          COLORS.length
                      ]
                    }
                  />
                )
              )}
            </Pie>

            <Tooltip />
          </PieChart>

        </div>

        <div className="bg-white p-6 rounded shadow">

          <h2 className="font-bold mb-4">
            Category Comparison
          </h2>

          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}