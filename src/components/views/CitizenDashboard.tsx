// SCIP Citizen Portal - Citizen Dashboard View
// Indian Government Portal Aesthetic with verifiable records and official citizen cards
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Report, Incident, AdminState, AdminDistrict, AdminSubDistrict, AdminBlock, AdminLocality } from '../../types/scip';
import { ReportDetailModal } from './ReportDetailModal';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink,
  Edit,
  Save,
  X,
  Home,
  Building2
} from 'lucide-react';

interface CitizenDashboardProps {
  onNavigateToSubmit: () => void;
  onNavigateToMyReports: () => void;
  onOpenIncident?: (incidentId: string) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  onNavigateToSubmit,
  onNavigateToMyReports,
  onOpenIncident
}) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Profile residence location edit state
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    stateId: user?.stateId || '',
    districtId: user?.districtId || '',
    subDistrictId: user?.subDistrictId || '',
    blockId: user?.blockId || '',
    localityId: user?.localityId || '',
    pinCode: user?.pinCode || '',
    residenceAddress: user?.residenceAddress || ''
  });
  const [states, setStates] = useState<AdminState[]>([]);
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [subDistricts, setSubDistricts] = useState<AdminSubDistrict[]>([]);
  const [blocks, setBlocks] = useState<AdminBlock[]>([]);
  const [localities, setLocalities] = useState<AdminLocality[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const rep = await api.getReports({ myOnly: true });
      const inc = await api.getIncidents();
      setReports(rep || []);
      setIncidents(inc || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileStates = async () => {
    try { const data = await api.getStates(); setStates(data); } catch {}
  };
  useEffect(() => { loadProfileStates(); }, []);

  useEffect(() => {
    const load = async () => {
      if (!profileForm.stateId) { setDistricts([]); setSubDistricts([]); setBlocks([]); setLocalities([]); return; }
      try { setDistricts(await api.getDistricts(profileForm.stateId)); } catch { setDistricts([]); }
    };
    load();
  }, [profileForm.stateId]);

  useEffect(() => {
    const load = async () => {
      if (!profileForm.districtId) { setSubDistricts([]); setBlocks([]); setLocalities([]); return; }
      try { setSubDistricts(await api.getSubDistricts(profileForm.districtId)); } catch { setSubDistricts([]); }
    };
    load();
  }, [profileForm.districtId]);

  useEffect(() => {
    const load = async () => {
      if (!profileForm.subDistrictId) { setBlocks([]); setLocalities([]); return; }
      try { setBlocks(await api.getBlocks(profileForm.subDistrictId)); } catch { setBlocks([]); }
    };
    load();
  }, [profileForm.subDistrictId]);

  useEffect(() => {
    const load = async () => {
      if (!profileForm.blockId) { setLocalities([]); return; }
      try { setLocalities(await api.getLocalities(profileForm.blockId)); } catch { setLocalities([]); }
    };
    load();
  }, [profileForm.blockId]);

  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileUpdating(true);
    try {
      await api.updateProfile({
        stateId: profileForm.stateId || undefined,
        districtId: profileForm.districtId || undefined,
        subDistrictId: profileForm.subDistrictId || undefined,
        blockId: profileForm.blockId || undefined,
        localityId: profileForm.localityId || undefined,
        pinCode: profileForm.pinCode || undefined,
        residenceAddress: profileForm.residenceAddress || undefined
      });
      setProfileEditMode(false);
      setProfileError('');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleCancelProfile = () => {
    setProfileForm({
      stateId: user?.stateId || '',
      districtId: user?.districtId || '',
      subDistrictId: user?.subDistrictId || '',
      blockId: user?.blockId || '',
      localityId: user?.localityId || '',
      pinCode: user?.pinCode || '',
      residenceAddress: user?.residenceAddress || ''
    });
    setProfileEditMode(false);
    setProfileError('');
  };

  const getName = (options: { id: string; name: string }[], id: string) => {
    if (!id) return 'Not set';
    const found = options.find(o => o.id === id);
    return found ? found.name : 'Not set';
  };

  const pendingCount = reports.filter(r => r.status === 'submitted' || r.status === 'analyzed').length;
  const activeReportsCount = reports.filter(r => r.status === 'under_review' || r.status === 'linked' || r.status === 'assigned').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const activeCommunityIncidents = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress');

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 text-[#253443]">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F5F91] tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#E89B36]" />
            <span>Citizen Engagement Services · Municipal District</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#153E63] mt-1">
            Welcome, {user?.name || 'Citizen'}
          </h1>
          <p className="text-xs text-[#657586] mt-0.5">
            Registered Citizen Profile: <span className="font-mono text-[#253443] font-semibold">{user?.email}</span>
          </p>
        </div>

          <button
            onClick={onNavigateToSubmit}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#E89B36]" />
            <span>Report New Grievance</span>
          </button>
        </div>

      {/* Citizen Residence Profile Card */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F5F91] tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-[#1F5F91]" />
            <span>Citizen Residence Profile</span>
          </div>
          {profileEditMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelProfile}
                disabled={profileUpdating}
                className="text-[11px] text-[#657586] hover:text-[#B42318] font-semibold cursor-pointer disabled:opacity-50"
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileUpdating}
                className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] disabled:opacity-50 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-1"
              >
                {profileUpdating ? <span className="animate-spin"></span> : <Save className="w-3 h-3" />} Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setProfileEditMode(true)}
              className="text-[11px] text-[#1F5F91] hover:text-[#153E63] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Edit className="w-3 h-3" /> Edit Residence
            </button>
          )}
        </div>

        {profileEditMode ? (
          <div className="space-y-3">
            {profileError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B42318] shrink-0" />
                <span>{profileError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">State / UT</label>
                <select
                  value={profileForm.stateId}
                  onChange={e => setProfileForm(prev => ({ ...prev, stateId: e.target.value, districtId: '', subDistrictId: '', blockId: '', localityId: '' }))}
                  className="w-full px-3 py-2 text-xs text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                >
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">District</label>
                <select
                  value={profileForm.districtId}
                  onChange={e => setProfileForm(prev => ({ ...prev, districtId: e.target.value, subDistrictId: '', blockId: '', localityId: '' }))}
                  disabled={!profileForm.stateId}
                  className="w-full px-3 py-2 text-xs text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                >
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">Sub-District</label>
                <select
                  value={profileForm.subDistrictId}
                  onChange={e => setProfileForm(prev => ({ ...prev, subDistrictId: e.target.value, blockId: '', localityId: '' }))}
                  disabled={!profileForm.districtId}
                  className="w-full px-3 py-2 text-xs text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                >
                  <option value="">Select Sub-District</option>
                  {subDistricts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">Block</label>
                <select
                  value={profileForm.blockId}
                  onChange={e => setProfileForm(prev => ({ ...prev, blockId: e.target.value, localityId: '' }))}
                  disabled={!profileForm.subDistrictId}
                  className="w-full px-3 py-2 text-xs text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                >
                  <option value="">Select Block</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">Locality</label>
                <select
                  value={profileForm.localityId}
                  onChange={e => setProfileForm(prev => ({ ...prev, localityId: e.target.value }))}
                  disabled={!profileForm.blockId}
                  className="w-full px-3 py-2 text-xs text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                >
                  <option value="">Select Locality</option>
                  {localities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={profileForm.pinCode}
                  onChange={e => setProfileForm(prev => ({ ...prev, pinCode: e.target.value.replace(/[^0-9]/g, '') }))}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#153E63] mb-1">Residence Address</label>
                <input
                  type="text"
                  value={profileForm.residenceAddress}
                  onChange={e => setProfileForm(prev => ({ ...prev, residenceAddress: e.target.value }))}
                  className="w-full px-3 py-2 text-xs text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:border-[#1F5F91] focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[10px] font-bold uppercase">State / UT</span>
              <div className="font-semibold text-[#253443] mt-1">{getName(states, user?.stateId || '')}</div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[10px] font-bold uppercase">District</span>
              <div className="font-semibold text-[#253443] mt-1">{getName(districts, user?.districtId || '')}</div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[10px] font-bold uppercase">Locality</span>
              <div className="font-semibold text-[#253443] mt-1">{getName(localities, user?.localityId || '')}</div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[10px] font-bold uppercase">PIN Code</span>
              <div className="font-semibold text-[#253443] mt-1 font-mono">{user?.pinCode || 'Not set'}</div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[10px] font-bold uppercase">Residence Address</span>
              <div className="font-semibold text-[#253443] mt-1 leading-snug">{user?.residenceAddress || 'Not set'}</div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stat Cards (Strictly Real Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#657586] font-semibold uppercase tracking-wider">
            <span>My Total Reports</span>
            <FileText className="w-4 h-4 text-[#1F5F91]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#153E63] font-mono tabular-nums">
            {isLoading ? '...' : reports.length}
          </div>
          <div className="text-[11px] text-[#657586]">Lifetime submitted observations</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#657586] font-semibold uppercase tracking-wider">
            <span>Pending Intake</span>
            <Clock className="w-4 h-4 text-[#E89B36]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#E89B36] font-mono tabular-nums">
            {isLoading ? '...' : pendingCount}
          </div>
          <div className="text-[11px] text-[#657586]">Queued for officer inspection</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#657586] font-semibold uppercase tracking-wider">
            <span>Under Review / Assigned</span>
            <AlertTriangle className="w-4 h-4 text-[#1F5F91]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1F5F91] font-mono tabular-nums">
            {isLoading ? '...' : activeReportsCount}
          </div>
          <div className="text-[11px] text-[#657586]">Dispatched to department work order</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#657586] font-semibold uppercase tracking-wider">
            <span>Resolved Observations</span>
            <CheckCircle2 className="w-4 h-4 text-[#28834A]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#28834A] font-mono tabular-nums">
            {isLoading ? '...' : resolvedCount}
          </div>
          <div className="text-[11px] text-[#28834A] font-semibold">Remediated & closed</div>
        </div>
      </div>

      {/* Public Community Hazard Alert Banner (if active incidents exist) */}
      {activeCommunityIncidents.length > 0 && (
        <div className="bg-[#EAF2F8] border border-[#DCE3EA] rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#153E63]">
            <AlertTriangle className="w-4 h-4 text-[#E89B36]" />
            <span>Active Community Advisories & Incident Work Orders in District</span>
          </div>
          <div className="divide-y divide-[#DCE3EA]">
            {activeCommunityIncidents.slice(0, 3).map(inc => (
              <div key={inc.id} className="py-2.5 text-xs text-[#253443] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#153E63] mr-2">{inc.title}</span>
                  <span className="text-[11px] text-[#657586]">({inc.locationName})</span>
                </div>
                {onOpenIncident && (
                  <button
                    onClick={() => onOpenIncident(inc.id)}
                    className="text-[11px] text-[#1F5F91] hover:text-[#153E63] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View advisory details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1F5F91]" />
            <h2 className="text-sm font-bold text-[#153E63]">My Recent Submissions</h2>
          </div>
          <button
            onClick={onNavigateToMyReports}
            className="text-xs text-[#1F5F91] hover:text-[#153E63] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View all submissions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#F5F7FA] border border-[#DCE3EA] flex items-center justify-center text-[#657586] mx-auto">
              <FileText className="w-5 h-5 text-[#1F5F91]" />
            </div>
            <div className="text-sm font-bold text-[#153E63]">No community reports submitted yet</div>
            <p className="text-xs text-[#657586] max-w-sm mx-auto leading-relaxed">
              Submit your first civic observation to begin generating municipal intelligence. Automatic NLP classification and clustering activate immediately upon submission.
            </p>
            <button
              onClick={onNavigateToSubmit}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#E89B36]" />
              <span>Submit First Observation</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F4F8]">
            {reports.slice(0, 5).map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                className="py-3.5 flex items-center justify-between hover:bg-[#F5F7FA] px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#153E63] flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#1F5F91] bg-[#EAF2F8] px-1.5 py-0.5 rounded border border-[#DCE3EA]">
                      {r.id}
                    </span>
                    <span>{r.title}</span>
                  </div>
                  <div className="text-[11px] text-[#657586] flex items-center gap-2 mt-1">
                    <span>{r.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1F5F91]" />
                      <span>{r.locationName}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    r.status === 'resolved'
                      ? 'bg-[#EBF7EE] text-[#28834A] border-[#A7E0B8]'
                      : 'bg-[#EAF2F8] text-[#1F5F91] border-[#DCE3EA]'
                  }`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-[#657586] mt-1 font-mono tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onOpenIncident={onOpenIncident}
        />
      )}
    </div>
  );
};
