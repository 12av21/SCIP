// SCIP Geographic Analytics Dashboard - State/District/Locality Distribution
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import {
  BarChart3,
  MapPin,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw
} from 'lucide-react';

export const GeoAnalyticsView: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [ovResult, hsResult] = await Promise.all([
        api.getGeoAnalytics().catch(() => ({ data: null })),
        api.getGeoAnalyticsHotspots().catch(() => ({ data: [] }))
      ]) as [{ data: any }, { data: any[] }];
      setOverview(ovResult.data || null);
      setHotspots(Array.isArray(hsResult.data) ? hsResult.data : []);
    } catch {
      setError('Failed to load geographic analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  const statCard = (title: string, value: string | number, sub: string, Icon: React.ComponentType<any>, color: string) => (
    <div className="bg-white p-5 rounded-xl border border-[#DCE3EA] shadow-xs space-y-2">
      <div className="flex items-center justify-between text-xs text-[#657586] font-semibold uppercase tracking-wider">
        <span>{title}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl sm:text-3xl font-black text-[#153E63] font-mono tabular-nums">{value}</div>
      <div className="text-[11px] text-[#657586]">{sub}</div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-10 text-center text-[#253443]">
        <div className="animate-spin inline-block h-8 w-8 border-4 border-[#DCE3EA] border-t-[#1F5F91] rounded-full mx-auto mb-4" />
        <p className="text-xs text-[#657586]">Loading geographic analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-10 text-center text-[#253443]">
        <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-xl text-xs inline-block">
          <AlertTriangle className="w-4 h-4 text-[#B42318] shrink-0 mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const stateDist = overview?.stateDistribution || [];
  const districtDist = overview?.districtDistribution || [];
  const localityDist = overview?.localityDistribution || [];
  const hotspotList = overview?.hotspots || [];
  const resolutionStats = overview?.resolutionStats || {};
  const pendingConcentration = overview?.pendingConcentration || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 text-[#253443]">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F5F91] tracking-wider">
            <GlobeIcon className="w-3.5 h-3.5 text-[#1F5F91]" />
            <span>Geographic Intelligence Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#153E63] mt-1">
            India Grievance Distribution & Hotspots
          </h1>
          <p className="text-xs text-[#657586] mt-0.5">
            Administrative boundary distribution, resolution SLA performance, and pending complaint concentration by state, district, and locality.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-xs font-bold text-[#1F5F91] bg-[#EAF2F8] hover:bg-[#dbeafe] border border-[#DCE3EA] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Total States / UTs', overview?.totalStates || 0, 'Administrative regions tracked', BarChart3, 'text-[#1F5F91]')}
        {statCard('Active Complaints', overview?.totalComplaints || 0, 'Grievances under review', MapPin, 'text-[#E89B36]')}
        {statCard('Resolution Rate', `${overview?.resolutionRate || 0}%`, 'Reports resolved vs submitted', CheckCircle2, 'text-[#28834A]')}
        {statCard('Avg Resolution', `${overview?.avgResolutionDays || 0} days`, 'Mean time to resolve', Clock, 'text-[#1F5F91]')}
      </div>

      {/* State Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#153E63] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1F5F91]" />
              Complaints by State / UT
            </h2>
            <span className="text-[10px] text-[#657586]">{stateDist.length} regions</span>
          </div>
          <div className="space-y-2">
            {stateDist.slice(0, 10).map((item: any, idx: number) => (
              <div key={item.stateId || item.name || idx} className="flex items-center gap-3">
                <div className="w-8 text-[10px] text-[#657586] font-mono">{item.stateId || item.name}</div>
                <div className="flex-1 bg-[#F5F7FA] rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-[#1F5F91]"
                    style={{ width: `${Math.min(100, ((item.count || 0) / Math.max(1, overview?.maxCount || 1)) * 100)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-[10px] font-mono text-[#153E63]">{item.count || 0}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-3.5 h-3.5 text-[#DC2626]" />
            <h2 className="text-sm font-bold text-[#153E63]">Top Hotspots</h2>
          </div>
          <div className="space-y-3">
            {hotspotList.slice(0, 6).map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-[#FEF3F2] border border-[#FCA5A5] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#DC2626]">Hotspot #{idx + 1}</span>
                  <span className="text-[10px] font-mono text-[#991B1B]">{item.reportCount || 0} reports</span>
                </div>
                <div className="text-xs text-[#253443]">{item.stateId || item.stateName || 'Unknown State'}</div>
                <div className="text-[10px] text-[#657586] mt-1">{item.districtId || item.districtName || ''} · {item.localityId || item.localityName || ''}</div>
                <div className="mt-2 h-1 bg-[#FCA5A5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#DC2626]" style={{ width: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolution & Pending Concentration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#153E63] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#28834A]" />
              Resolution Time by State
            </h2>
          </div>
          <div className="space-y-3">
            {Object.entries(resolutionStats || {}).slice(0, 8).map(([state, stats]: [string, any]) => (
              <div key={state} className="flex items-center justify-between py-2 border-b border-[#F0F4F8] last:border-0">
                <div>
                  <div className="text-xs font-semibold text-[#153E63]">{state}</div>
                  <div className="text-[10px] text-[#657586]">{stats?.sampleSize || 0} cases</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-[#1F5F91]">{stats?.avgDays || 0}d</div>
                  <div className="text-[10px] text-[#657586]">avg resolution</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#153E63] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#E89B36]" />
              Pending Complaint Concentration
            </h2>
          </div>
          <div className="space-y-3">
            {pendingConcentration.slice(0, 8).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-[#F0F4F8] last:border-0">
                <div>
                  <div className="text-xs font-semibold text-[#153E63]">{item.localityId || item.localityName || item.districtId || 'Unknown'}</div>
                  <div className="text-[10px] text-[#657586]">{item.districtId || item.districtName || ''} · {item.stateId || item.stateName || ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-[#DC2626]">{item.pendingCount || 0}</div>
                  <div className="text-[10px] text-[#657586]">pending</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline GlobeIcon since lucide-react Globe might not exist in this version
const GlobeIcon = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
