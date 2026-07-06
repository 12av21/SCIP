import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const COLORS = ['#10182a', '#b45309', '#0ea5e9', '#10b981', '#6366f1'];
const mockStats = [
  { name: 'Water', count: 45 }, { name: 'Electricity', count: 32 },
  { name: 'Road', count: 56 }, { name: 'Waste', count: 28 }, { name: 'Health', count: 12 },
];

export default function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display">Executive Intelligence</h1>
          <p className="opacity-60 text-sm italic">"Transforming civic feedback into actionable strategy."</p>
        </div>
        <div className="bg-ink text-paper px-4 py-2 rounded-lg text-xs font-mono">
          LATEST SYNC: {new Date().toLocaleTimeString()}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<AlertTriangle className="text-amber-600" />} label="Critical Issues" value="14" sub="AI priority flag active" />
        <StatCard icon={<Clock className="text-blue-600" />} label="Avg. Resolution" value="3.2d" sub="-12% this month" />
        <StatCard icon={<CheckCircle className="text-emerald-600" />} label="Resolved Cases" value="1,284" sub="94% satisfaction" />
        <StatCard icon={<TrendingUp className="text-indigo-600" />} label="Ground Teams" value="28" sub="Deployments authorized" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="stamp-card p-6">
          <h3 className="text-lg mb-6 font-display font-semibold uppercase tracking-tight">Categorical Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                <Tooltip cursor={{fill: '#fdfcf8'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#10182a" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stamp-card p-6">
          <h3 className="text-lg mb-6 font-display font-semibold uppercase tracking-tight">Priority Breakdown (Gemini)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: 'Critical', value: 15 }, { name: 'High', value: 25 }, { name: 'Medium', value: 40 }, { name: 'Low', value: 20 }]}
                  innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                >
                  {mockStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4 text-[10px] font-mono uppercase opacity-60">
               <span>● Critical</span><span>● High</span><span>● Medium</span><span>● Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <div className="stamp-card p-6 border-l-4 border-l-ink">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
        <span className="text-2xl font-bold tracking-tighter">{value}</span>
      </div>
      <p className="text-sm font-display font-semibold">{label}</p>
      <p className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{sub}</p>
    </div>
  );
}