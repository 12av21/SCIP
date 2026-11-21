// SCIP Authority - Strategic Command Dashboard for Authority Directors
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { Incident, Report, User, Department } from '../../types/scip';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Target,
  BarChart3,
  MapPin,
  FileText,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Radio,
  Crown,
  Activity,
  Zap,
  Building2
} from 'lucide-react';

interface AuthorityDashboardProps {}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [incRes, repRes, deptRes, userRes] = await Promise.all([
        api.getIncidents(),
        api.getReports(),
        api.getDepartments(),
        api.getUsers()
      ]);
      setIncidents(incRes);
      setReports(repRes);
      setDepartments(deptRes);
      setUsers(userRes);
    } catch {
      // Ignore errors for now
    } finally {
      setIsLoading(false);
    }
  };

  // KPI Calculations
  const totalIncidents = incidents.length;
  const activeIncidents = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress' || i.status === 'under_review').length;
  const potentialIncidents = incidents.filter(i => i.status === 'potential').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const dismissedIncidents = incidents.filter(i => i.status === 'dismissed').length;
  const criticalIncidents = incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P1').length;
  const highIncidents = incidents.filter(i => i.priority === 'P2_HIGH' || i.priority === 'P2').length;

  const totalReports = reports.length;
  const newReports = reports.filter(r => r.status === 'submitted' || r.status === 'processing').length;
  const processedReports = reports.filter(r => r.status === 'analyzed' || r.status === 'linked').length;

  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.activeIncidentsCount > 0).length;

  const totalOfficers = users.filter(u => u.role === 'officer').length;
  const totalDeptOfficers = users.filter(u => u.role === 'dept_officer').length;

  // Department performance
  const deptPerformance = departments.map(dept => {
    const deptIncidents = incidents.filter(i => i.assignedDepartmentId === dept.id);
    const resolved = deptIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const total = deptIncidents.length;
    const avgResolutionDays = total > 0 
      ? deptIncidents.reduce((sum, i) => {
          if (i.resolvedAt && i.createdAt) {
            const diff = new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }
          return sum;
        }, 0) / total
      : 0;
    return { ...dept, resolved, total, avgResolutionDays: Math.round(avgResolutionDays * 10) / 10 };
  }).sort((a, b) => b.total - a.total);

  // Priority distribution
  const priorityDist = {
    P1_CRITICAL: incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P1').length,
    P2_HIGH: incidents.filter(i => i.priority === 'P2_HIGH' || i.priority === 'P2').length,
    P3_MEDIUM: incidents.filter(i => i.priority === 'P3_MEDIUM' || i.priority === 'P3').length,
    P4_LOW: incidents.filter(i => i.priority === 'P4_LOW' || i.priority === 'P4').length
  };

  // Category distribution
  const categoryDist = incidents.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Status distribution
  const statusDist = incidents.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Weekly trend (mock calculation based on createdAt)
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();
    const count = incidents.filter(inc => 
      inc.createdAt >= dayStart && inc.createdAt <= dayEnd
    ).length;
    return { day: date.toLocaleDateString('en-IN', { weekday: 'short' }), count };
  });

  const formatNumber = (n: number) => n.toLocaleString('en-IN');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#1F5F91] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-[#253443]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3EA] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F5F91]">
            <span className="w-2 h-2 rounded-full bg-[#E89B36]" />
            <span>Strategic Command Authority</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#153E63] mt-1">Authority Strategic Dashboard</h1>
          <p className="text-xs text-[#657586] font-medium mt-0.5">
            Cross-departmental performance oversight, incident lifecycle governance, and AI-generated situational intelligence for municipal leadership.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-medium text-[#153E63] bg-white border border-[#DCE3EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F5F91] cursor-pointer"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Executive KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          icon={<Crown className="w-5 h-5 text-[#E89B36]" />}
          label="Total Incidents"
          value={formatNumber(totalIncidents)}
          subtitle="All lifecycle stages"
          trend={"+12% vs prev period"}
          trendUp={true}
        />
        <KPICard
          icon={<Activity className="w-5 h-5 text-[#E89B36]" />}
          label="Active Operations"
          value={formatNumber(activeIncidents)}
          subtitle={`${potentialIncidents} awaiting review`}
          trend={`${criticalIncidents} critical`}
          trendUp={false}
          alert={criticalIncidents > 0}
        />
        <KPICard
          icon={<CheckCircle2 className="w-5 h-5 text-[#28834A]" />}
          label="Resolved"
          value={formatNumber(resolvedIncidents)}
          subtitle={`${dismissedIncidents} dismissed`}
          trend={`${Math.round((resolvedIncidents / (totalIncidents || 1)) * 100)}% resolution rate`}
          trendUp={true}
        />
        <KPICard
          icon={<FileText className="w-5 h-5 text-[#1F5F91]" />}
          label="Community Reports"
          value={formatNumber(totalReports)}
          subtitle={`${newReports} new • ${processedReports} processed`}
          trend={`${Math.round((processedReports / (totalReports || 1)) * 100)}% triaged`}
          trendUp={true}
        />
        <KPICard
          icon={<Building2 className="w-5 h-5 text-[#657586]" />}
          label="Departments Engaged"
          value={formatNumber(activeDepartments)}
          subtitle={`${totalDepartments} total departments`}
          trend={`${Math.round((activeDepartments / (totalDepartments || 1)) * 100)}% active`}
          trendUp={activeDepartments > 0}
        />
        <KPICard
          icon={<Users className="w-5 h-5 text-[#153E63]" />}
          label="Field Force"
          value={formatNumber(totalOfficers + totalDeptOfficers)}
          subtitle={`${totalOfficers} officers • ${totalDeptOfficers} desk officers`}
          trend="100% jurisdictional coverage"
          trendUp={true}
        />
      </div>

      {/* AI-Generated Situation Report Banner */}
      <AISituationReport 
        incidents={incidents} 
        departments={departments} 
        timeRange={timeRange} 
      />

      {/* Main Grid: Department Performance & Priority Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE3EA] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#1F5F91]" />
              <h3 className="text-xs font-bold text-[#153E63] uppercase tracking-wider">Department Performance Overview</h3>
            </div>
            <span className="text-[11px] text-[#657586] font-mono">{deptPerformance.length} departments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#657586] font-semibold uppercase tracking-wider border-b border-[#DCE3EA]">
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2 pr-4 text-right">Total</th>
                  <th className="pb-2 pr-4 text-right">Active</th>
                  <th className="pb-2 pr-4 text-right">Resolved</th>
                  <th className="pb-2 pr-4 text-right">Resolution %</th>
                  <th className="pb-2 pr-4 text-right">Avg Days</th>
                  <th className="pb-2 text-right">SLA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EA]">
                {deptPerformance.map((dept, idx) => {
                  const resolutionRate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                  const slaStatus = dept.avgResolutionDays <= 3 ? 'On Track' : dept.avgResolutionDays <= 7 ? 'At Risk' : 'Breached';
                  const slaColor = slaStatus === 'On Track' ? 'text-[#28834A] bg-[#E8F5E9]' : slaStatus === 'At Risk' ? 'text-[#E89B36] bg-[#FFF8E1]' : 'text-[#B42318] bg-[#FDEDEC]';
                  return (
                    <tr key={dept.id} className={idx % 2 === 0 ? 'bg-[#F5F7FA]' : ''}>
                      <td className="py-2.5 pr-4 font-medium text-[#153E63]">{dept.name}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{dept.total}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#E89B36]">{dept.activeIncidentsCount}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#28834A]">{dept.resolved}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{resolutionRate}%</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{dept.avgResolutionDays}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${slaColor}`}>{slaStatus}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority & Severity Matrix */}
        <div className="bg-white rounded-2xl border border-[#DCE3EA] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-[#153E63] uppercase tracking-wider">Priority & Severity Matrix</h3>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'P1_CRITICAL', label: 'P1 Critical', count: priorityDist.P1_CRITICAL, color: 'bg-rose-500', textColor: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', icon: <Zap className="w-3.5 h-3.5" /> },
              { key: 'P2_HIGH', label: 'P2 High', count: priorityDist.P2_HIGH, color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
              { key: 'P3_MEDIUM', label: 'P3 Medium', count: priorityDist.P3_MEDIUM, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', icon: <Radio className="w-3.5 h-3.5" /> },
              { key: 'P4_LOW', label: 'P4 Low', count: priorityDist.P4_LOW, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ].map(p => (
              <div key={p.key} className={`p-4 rounded-xl border ${p.bgColor} ${p.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center`}>{p.icon}</span>
                    <div>
                      <div className="font-semibold text-xs text-[#153E63]">{p.label}</div>
                      <div className="text-[11px] text-[#657586]">{totalIncidents > 0 ? Math.round((p.count / totalIncidents) * 100) : 0}% of total</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-black ${p.textColor} font-mono tabular-nums`}>{p.count}</div>
                    <div className="text-[11px] text-[#657586]">incidents</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Category Breakdown */}
          <div className="border-t border-[#DCE3EA] pt-3 mt-2">
            <h4 className="text-xs font-bold text-[#657586] uppercase tracking-wider mb-3">Incident Category Distribution</h4>
            <div className="space-y-2">
              {Object.entries(categoryDist)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-16 text-[11px] text-[#657586] truncate">{cat}</div>
                    <div className="flex-1 h-2 bg-[#DCE3EA] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#1F5F91] rounded-full transition-all duration-300" 
                        style={{ width: `${totalIncidents > 0 ? (count / totalIncidents) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[#153E63] w-10 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Flow & Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Status Flow */}
        <div className="bg-white rounded-2xl border border-[#DCE3EA] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#1F5F91]" />
              <h3 className="text-xs font-bold text-[#153E63] uppercase tracking-wider">Incident Lifecycle Flow</h3>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { status: 'potential', label: 'Potential (AI Detected)', count: statusDist.potential || 0, color: 'bg-[#E89B36]', next: 'confirm/dismiss' },
              { status: 'under_review', label: 'Under Review', count: statusDist.under_review || 0, color: 'bg-[#1F5F91]', next: 'confirm/dismiss' },
              { status: 'confirmed', label: 'Confirmed', count: statusDist.confirmed || 0, color: 'bg-[#153E63]', next: 'assign' },
              { status: 'in_progress', label: 'In Progress', count: statusDist.in_progress || 0, color: 'bg-[#3B82F6]', next: 'resolve' },
              { status: 'resolved', label: 'Resolved', count: statusDist.resolved || 0, color: 'bg-[#28834A]', next: 'verify/close' },
              { status: 'closed', label: 'Closed', count: statusDist.closed || 0, color: 'bg-[#657586]', next: 'final' },
              { status: 'dismissed', label: 'Dismissed', count: statusDist.dismissed || 0, color: 'bg-[#9E9E9E]', next: 'archived' },
            ].map((s, idx) => (
              <div key={s.status} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-[#153E63] truncate pr-2">{s.label}</span>
                    <span className="text-xs font-mono tabular-nums text-[#657586]">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-[#DCE3EA] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#1F5F91] rounded-full transition-all duration-300" 
                      style={{ width: `${totalIncidents > 0 ? (s.count / totalIncidents) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-[#657586] whitespace-nowrap">{s.next}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-white rounded-2xl border border-[#DCE3EA] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1F5F91]" />
              <h3 className="text-xs font-bold text-[#153E63] uppercase tracking-wider">7-Day Incident Creation Trend</h3>
            </div>
          </div>

          <div className="h-48 flex items-end justify-between gap-2">
            {weeklyTrend.map((d, i) => {
              const maxCount = Math.max(...weeklyTrend.map(w => w.count), 1);
              const height = (d.count / maxCount) * 100;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-[#1F5F91] rounded-t transition-all duration-300 hover:bg-[#153E63]" 
                    style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                  />
                  <span className="text-[10px] text-[#657586]">{d.day}</span>
                  <span className="text-[10px] font-mono tabular-nums text-[#153E63]">{d.count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#657586] text-center">Peak: {Math.max(...weeklyTrend.map(w => w.count))} incidents on {weeklyTrend.find(w => w.count === Math.max(...weeklyTrend.map(w => w.count)))?.day}</p>
        </div>
      </div>

      {/* Cross-Department Coordination Alerts */}
      <div className="bg-white rounded-2xl border border-[#DCE3EA] p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#E89B36]" />
            <h3 className="text-xs font-bold text-[#153E63] uppercase tracking-wider">Coordination Alerts & Escalations</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AlertCard
            icon={<ArrowUpRight className="w-4 h-4" />}
            title="Escalated Incidents"
            value={incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P1').length}
            description="Require immediate authority attention"
            color="rose"
            action="Review Queue"
          />
          <AlertCard
            icon={<Clock className="w-4 h-4" />}
            title="SLA Breach Risk"
            value={deptPerformance.filter(d => d.avgResolutionDays > 7).length}
            description="Departments exceeding 7-day avg resolution"
            color="orange"
            action="View Details"
          />
          <AlertCard
            icon={<Users className="w-4 h-4" />}
            title="Unassigned Critical"
            value={incidents.filter(i => (i.priority === 'P1_CRITICAL' || i.priority === 'P1') && !i.assignedOfficerId).length}
            description="High-priority incidents without field officer"
            color="amber"
            action="Assign Now"
          />
          <AlertCard
            icon={<Shield className="w-4 h-4" />}
            title="Pending Review"
            value={potentialIncidents}
            description="AI-detected clusters awaiting human confirmation"
            color="blue"
            action="Intelligence"
          />
        </div>
      </div>
    </div>
  );
};

// Sub-components
const KPICard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  trend: string;
  trendUp: boolean;
  alert?: boolean;
}> = ({ icon, label, value, subtitle, trend, trendUp, alert }) => (
  <div className={`bg-white p-5 rounded-xl border ${alert ? 'border-rose-200' : 'border-[#DCE3EA]'} shadow-xs space-y-2 ${alert ? 'ring-1 ring-rose-200' : ''}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#657586] font-semibold uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className="text-2xl sm:text-3xl font-black text-[#153E63] font-mono tabular-nums">{value}</div>
    <div className="text-[11px] text-[#657586]">{subtitle}</div>
    <div className={`text-[11px] font-medium flex items-center gap-1 ${trendUp ? 'text-[#28834A]' : 'text-rose-600'}`}>
      {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      <span>{trend}</span>
    </div>
  </div>
);

const AlertCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
  color: 'rose' | 'orange' | 'amber' | 'blue';
  action: string;
}> = ({ icon, title, value, description, color, action }) => {
  const colors = {
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-100', iconText: 'text-rose-600', btn: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600', btn: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-600', btn: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600', btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200' }
  };
  const c = colors[color];
  return (
    <div className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-lg ${c.iconBg} ${c.iconText}`}>{icon}</span>
        <span className={`text-xl font-black ${c.text} font-mono tabular-nums`}>{value}</span>
      </div>
      <h4 className={`font-semibold text-xs ${c.text}`}>{title}</h4>
      <p className={`text-[11px] ${c.text}/80 mt-1`}>{description}</p>
      <button className={`mt-3 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${c.btn}`}>{action}</button>
    </div>
  );
};

const AISituationReport: React.FC<{
  incidents: Incident[];
  departments: Department[];
  timeRange: string;
}> = ({ incidents, departments, timeRange }) => {
  const activeCount = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress').length;
  const criticalCount = incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P1').length;
  const deptCount = departments.filter(d => d.activeIncidentsCount > 0).length;
  const avgResDays = incidents
    .filter(i => i.resolvedAt && i.createdAt)
    .reduce((sum, i) => sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) 
    / Math.max(1, incidents.filter(i => i.resolvedAt).length);

  const narrative = `As of ${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}, the municipal intelligence grid tracks ${incidents.length} total incidents across ${deptCount} active departments. ${criticalCount > 0 ? `⚠ ${criticalCount} P1-Critical incidents demand immediate executive oversight. ` : ''}${activeCount} operations are currently in progress with an average resolution cycle of ${Math.round(avgResDays * 10) / 10} days. AI clustering has identified ${incidents.filter(i => i.isAIGenerated).length} algorithmically-generated incident candidates requiring human validation. Top risk vectors: ${Object.entries(incidents.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c).join(', ') || 'none detected'}.`;

  return (
    <div className="bg-gradient-to-r from-[#153E63] to-[#1F5F91] rounded-2xl p-5 space-y-3 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#E89B36] animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#E89B36]">AI-Generated Situation Report</span>
        <span className="text-[10px] text-slate-300 ml-auto">{timeRange} window</span>
      </div>
      <p className="text-sm leading-relaxed text-slate-100 font-medium">{narrative}</p>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/20">
        <span className="px-2 py-1 text-[10px] font-semibold bg-white/10 rounded-full border border-white/20">Executive Summary</span>
        <span className="px-2 py-1 text-[10px] font-semibold bg-white/10 rounded-full border border-white/20">Auto-Generated</span>
        <span className="px-2 py-1 text-[10px] font-semibold bg-white/10 rounded-full border border-white/20">Human Review Required</span>
        <span className="px-2 py-1 text-[10px] font-semibold bg-[#E89B36]/20 rounded-full border border-[#E89B36]/50 text-[#E89B36]">Confidence: 87%</span>
      </div>
    </div>
  );
};