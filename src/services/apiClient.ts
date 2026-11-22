// SCIP - Centralized Typed API Client
// Handles authentication headers, token persistence, error parsing, and graceful fallback

import {
  User,
  Report,
  Incident,
  AIAnalysis,
  SpatioTemporalCluster,
  AgentBriefing,
  AuditLog,
  Department,
  Notification,
  Feedback,
  UserRole,
  InspectionRecord,
  ModelEvaluationMetrics,
  SemanticEvaluationResult,
  AdminState,
  AdminDistrict,
  AdminSubDistrict,
  AdminBlock,
  AdminLocality,
  IPSecurityLog,
  AdministrativeBoundary,
  ImageMetadata,
  ImageAnalysis,
  ImageUploadResult
} from '../types/scip.js';

const TOKEN_KEY = 'scip_auth_token';
const USER_KEY = 'scip_auth_user';

// Default per-request timeout. Prevents UI spinners from hanging forever when the
// network or backend stalls. Callers can override per request via `signal`.
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const clerk = (window as any).__scip_clerk__;
  if (clerk && typeof clerk.session?.getToken === 'function') {
    try {
      return await clerk.session.getToken();
    } catch {
      return null;
    }
  }
  return null;
}

class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  public async getToken(): Promise<string | null> {
    const clerkToken = await getClerkToken();
    if (clerkToken) {
      this.token = clerkToken;
      return this.token;
    }
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  public getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(USER_KEY);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  public setStoredUser(user: User | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = await this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // AbortController: enforce a timeout and honor any caller-supplied signal.
    const controller = new AbortController();
    const externalSignal = options.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Request failed with status ${res.status}`);
      }

      // Read as text first so an empty body (e.g. 204) does not throw.
      const text = await res.text();
      return (text ? JSON.parse(text) : ({} as T));
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Distinguish a caller-initiated abort from an actual timeout so the UI
        // shows the right message.
        if (externalSignal?.aborted) {
          throw new Error('Request aborted');
        }
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }

  // --- Auth (Clerk-managed) ---

  // Clerk handles registration via <SignUp /> or Clerk-hosted pages.
  // SCIP does not expose password-based registration.

  public async logout() {
    try {
      const clerk = (window as any).__scip_clerk__;
      if (clerk && typeof clerk.signOut === 'function') {
        await clerk.signOut();
      }
    } catch {
      // Ignore Clerk sign-out errors
    }
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    this.setToken(null);
    this.setStoredUser(null);
  }

  // Reports
  public async getReports(params?: { category?: string; status?: string; urgency?: string; myOnly?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.urgency) query.set('urgency', params.urgency);
    if (params?.myOnly) query.set('myOnly', 'true');

    const res = await this.request<{ success: boolean; data: Report[] }>(`/api/reports?${query.toString()}`);
    return res.data;
  }

  public async getReportById(id: string) {
    const res = await this.request<{ success: boolean; data: { report: Report; analysis: AIAnalysis | null } }>(`/api/reports/${id}`);
    return res.data;
  }

  public async createReport(payload: Partial<Report>) {
    const res = await this.request<{ success: boolean; data: { report: Report; analysis: AIAnalysis } }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async updateReport(id: string, updates: Partial<Report>) {
    const res = await this.request<{ success: boolean; data: Report }>(`/api/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res.data;
  }

  public async reanalyzeReport(id: string) {
    const res = await this.request<{ success: boolean; data: AIAnalysis }>(`/api/reports/${id}/reanalyze`, {
      method: 'POST'
    });
    return res.data;
  }

  // Incidents
  public async getIncidents(params?: { status?: string; category?: string; priority?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);

    const res = await this.request<{ success: boolean; data: Incident[] }>(`/api/incidents?${query.toString()}`);
    return res.data;
  }

  public async getIncidentById(id: string) {
    const res = await this.request<{ success: boolean; data: { incident: Incident; linkedReports: Report[] } }>(`/api/incidents/${id}`);
    return res.data;
  }

  public async createIncidentFromCluster(cluster: SpatioTemporalCluster) {
    const res = await this.request<{ success: boolean; data: Incident }>('/api/incidents/from-cluster', {
      method: 'POST',
      body: JSON.stringify({ cluster })
    });
    return res.data;
  }

  public async reviewIncident(id: string, payload: { action: 'confirm' | 'dismiss'; notes: string; departmentId?: string; officerId?: string }) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async resolveIncident(id: string, payload: { actionTaken: string; preventiveMeasures?: string; costEstimate?: number }) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async closeIncident(id: string, notes?: string) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
    return res.data;
  }

  public async reopenIncident(id: string, reason: string) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    return res.data;
  }

  public async verifyResolution(id: string, verified: boolean, comments?: string) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/verify-resolution`, {
      method: 'POST',
      body: JSON.stringify({ verified, comments })
    });
    return res.data;
  }

  // Intelligence
  public async runAgentQuery(query: string, specificTool?: string) {
    const res = await this.request<{ success: boolean; data: AgentBriefing }>('/api/intelligence/agent', {
      method: 'POST',
      body: JSON.stringify({ query, specificTool })
    });
    return res.data;
  }

  public async getClusters() {
    const res = await this.request<{ success: boolean; data: SpatioTemporalCluster[] }>('/api/intelligence/clusters');
    return res.data;
  }

  public async getHotspots() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/intelligence/hotspots');
    return res.data;
  }

  // Public Stats (no auth required)
  public async getPublicStats() {
    const res = await this.request<{ success: boolean; data: any }>('/api/public/stats');
    return res.data;
  }

  public async getPublicLatest() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/public/latest');
    return res.data;
  }

  public async getTrends() {
    const res = await this.request<{ success: boolean; data: any }>('/api/intelligence/trends');
    return res.data;
  }

  // AI Response Generation
  public async getCitizenResponse(reportId: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/intelligence/citizen/response/${reportId}`);
    return res.data;
  }

  public async getFieldOfficerBriefing(incidentId: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/intelligence/officer/briefing/${incidentId}`);
    return res.data;
  }

  public async getDepartmentIntelligence() {
    const res = await this.request<{ success: boolean; data: any }>('/api/intelligence/dept/intelligence');
    return res.data;
  }

  public async getAnalystIntelligence() {
    const res = await this.request<{ success: boolean; data: any }>('/api/intelligence/analyst/intelligence');
    return res.data;
  }

  public async getAuthoritySummary() {
    const res = await this.request<{ success: boolean; data: any }>('/api/intelligence/authority/summary');
    return res.data;
  }

  public async getAdminAIHealth() {
    const res = await this.request<{ success: boolean; data: any }>('/api/intelligence/admin/ai-health');
    return res.data;
  }

  // Admin
  public async getUsers() {
    const res = await this.request<{ success: boolean; data: User[] }>('/api/admin/users');
    return res.data;
  }

  public async updateUserRole(userId: string, role: UserRole) {
    const res = await this.request<{ success: boolean; data: User }>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    return res.data;
  }

  public async getDepartments() {
    const res = await this.request<{ success: boolean; data: Department[] }>('/api/admin/departments');
    return res.data;
  }

  public async getAuditLogs(params?: { module?: string; action?: string }) {
    const query = new URLSearchParams();
    if (params?.module) query.set('module', params.module);
    if (params?.action) query.set('action', params.action);
    const res = await this.request<{ success: boolean; data: AuditLog[] }>(`/api/admin/audit-logs?${query.toString()}`);
    return res.data;
  }

  // Locations
  public async getStates() {
    const res = await this.request<{ success: boolean; data: AdminState[] }>('/api/locations/states');
    return res.data;
  }

  public async getDistricts(stateId?: string) {
    const query = stateId ? `?stateId=${encodeURIComponent(stateId)}` : '';
    const res = await this.request<{ success: boolean; data: AdminDistrict[] }>(`/api/locations/districts${query}`);
    return res.data;
  }

  public async getSubDistricts(districtId?: string) {
    const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : '';
    const res = await this.request<{ success: boolean; data: AdminSubDistrict[] }>(`/api/locations/sub-districts${query}`);
    return res.data;
  }

  public async getBlocks(subDistrictId?: string) {
    const query = subDistrictId ? `?subDistrictId=${encodeURIComponent(subDistrictId)}` : '';
    const res = await this.request<{ success: boolean; data: AdminBlock[] }>(`/api/locations/blocks${query}`);
    return res.data;
  }

  public async getLocalities(blockId?: string) {
    const query = blockId ? `?blockId=${encodeURIComponent(blockId)}` : '';
    const res = await this.request<{ success: boolean; data: AdminLocality[] }>(`/api/locations/localities${query}`);
    return res.data;
  }

  // Geoanalytics
  public async getGeoAnalytics() {
    const res = await this.request<{ success: boolean; data: any }>('/api/geoanalytics/overview');
    return res.data;
  }

  public async getGeoAnalyticsHotspots() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/geoanalytics/hotspots');
    return res.data;
  }

  public async submitFeedback(payload: { reportId?: string; incidentId?: string; rating: number; comments: string }) {
    const res = await this.request<{ success: boolean; data: Feedback }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async updateProfile(payload: { name?: string; phone?: string; stateId?: string; districtId?: string; subDistrictId?: string; blockId?: string; localityId?: string; pinCode?: string; residenceAddress?: string }) {
    const res = await this.request<{ success: boolean; data: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    this.setStoredUser(res.data);
    return res.data;
  }

  // --- SMS Verification ---

  public async sendSmsVerification(phone: string) {
    return await this.request<{ success: boolean; message: string; provider?: string }>('/api/verification/send-sms', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }

  public async verifySms(phone: string, otp: string) {
    return await this.request<{ success: boolean; message: string }>('/api/verification/verify-sms', {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    });
  }

  public async getVerificationStatus() {
    return await this.request<{ success: boolean; data: { emailVerified: boolean; phoneVerified: boolean; verificationAttempts: number; lastVerificationSentAt?: string } }>('/api/verification/status', {
      method: 'GET'
    });
  }

  public async resendVerification(channel: 'email' | 'sms') {
    return await this.request<{ success: boolean; message: string }>('/api/verification/resend', {
      method: 'POST',
      body: JSON.stringify({ channel })
    });
  }

  // --- Clerk Identity Linking (Phase 3.1.3) ---

  public async requestAccountLink(payload: { email?: string; scipUserId?: string; verificationMethod: 'ADMIN_APPROVED' | 'ONE_TIME_CHALLENGE' }) {
    return await this.request<{ success: boolean; message: string }>('/api/auth/linking/request', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Secure citizen onboarding for a verified Clerk identity with no existing
   * SCIP account. Creates a new citizen profile and links the Clerk subject.
   * Always returns role 'citizen'; never escalates privileges.
   */
  public async onboardClerkCitizen(payload: { name: string; email: string; phone?: string; residenceAddress?: string }) {
    return await this.request<{ success: boolean; message: string; data?: { id: string; name: string; email: string; role: string; status: string } }>('/api/auth/linking/onboard', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async getAccountLinkStatus() {
    return await this.request<{ success: boolean; data: { status: string; id?: string; verificationMethod?: string; challengePending?: boolean; challengeExpiresAt?: string; attemptsRemaining?: number; expiresAt?: string; user?: { id: string; name: string; email: string; role: string; status: string } } }>('/api/auth/linking/status', {
      method: 'GET'
    });
  }

  public async submitAccountLinkChallenge(id: string, otp: string) {
    return await this.request<{ success: boolean; message: string; data?: { linked: boolean } }>('/api/auth/linking/challenge', {
      method: 'POST',
      body: JSON.stringify({ id, otp })
    });
  }

  public async cancelAccountLink(id: string) {
    return await this.request<{ success: boolean; message: string }>('/api/auth/linking/cancel', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  public async getPendingAccountLinks() {
    return await this.request<{ success: boolean; data: any[]; meta?: { total: number } }>('/api/admin/clerk-links/pending', {
      method: 'GET'
    });
  }

  public async decideAccountLink(id: string, decision: 'approve' | 'reject', reason?: string) {
    return await this.request<{ success: boolean; message: string; data?: any }>(`/api/admin/clerk-links/${id}/${decision}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  public async withdrawReport(id: string) {
    const res = await this.request<{ success: boolean; data: Report }>(`/api/reports/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  }

  public async rejectReport(id: string, reason: string) {
    const res = await this.request<{ success: boolean; data: Report }>(`/api/reports/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    return res.data;
  }

  public async updateUserStatus(userId: string, status: 'active' | 'suspended') {
    const res = await this.request<{ success: boolean; data: User }>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return res.data;
  }

  public async submitInspection(incidentId: string, payload: {
    verifiedStatus: 'verified_match' | 'disputed' | 'partial';
    observations: string;
    checklist: {
      physicalVerification: boolean;
      safetyHazardAssessed: boolean;
      structuralDamageChecked: boolean;
      utilityImpactVerified: boolean;
    };
    evidencePhotos?: string[];
    recommendedAction?: string;
  }) {
    const res = await this.request<{ success: boolean; data: InspectionRecord }>(
      `/api/incidents/${incidentId}/inspection`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    return res.data;
  }

  public async getInspections(incidentId: string) {
    const res = await this.request<{ success: boolean; data: InspectionRecord[] }>(
      `/api/incidents/${incidentId}/inspections`
    );
    return res.data;
  }

  public async verifyInspection(incidentId: string, payload: {
    inspectionId: string;
    departmentRemarks: string;
    isApproved: boolean;
  }) {
    const res = await this.request<{ success: boolean; data: InspectionRecord }>(
      `/api/incidents/${incidentId}/verify-inspection`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    return res.data;
  }

  public async assignIncident(incidentId: string, payload: {
    departmentId?: string;
    officerId: string;
    officerName: string;
    notes?: string;
  }) {
    const res = await this.request<{ success: boolean; data: Incident }>(
      `/api/incidents/${incidentId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    return res.data;
  }

  public async escalateIncident(incidentId: string, reason: string) {
    const res = await this.request<{ success: boolean; data: Incident }>(
      `/api/incidents/${incidentId}/escalate`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    );
    return res.data;
  }

  // Geographic jurisdiction & officer recommendation
  public async getJurisdiction(lat: number, lng: number) {
    const res = await this.request<{ success: boolean; data: { stateId?: string; stateName?: string; districtId?: string; districtName?: string; subDistrictId?: string; subDistrictName?: string; blockId?: string; blockName?: string; localityId?: string; localityName?: string; withinKnownBoundary: boolean; coordinate: { latitude: number; longitude: number } } }>(
      `/api/incidents/jurisdiction?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    );
    return res.data;
  }

  public async getRecommendedOfficers(lat: number, lng: number, departmentId?: string) {
    const query = departmentId ? `&departmentId=${encodeURIComponent(departmentId)}` : '';
    const res = await this.request<{ success: boolean; data: { id: string; name: string; departmentId: string; departmentName: string }[] }>(
      `/api/incidents/recommended-officers?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}${query}`
    );
    return res.data;
  }

  public async flagReview(incidentId: string, payload: { reason: string; reviewType?: string }) {
    const res = await this.request<{ success: boolean; data: { incidentId: string; reviewType: string; reason: string; jurisdiction: any } }>(
      `/api/incidents/${incidentId}/flag-review`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    return res.data;
  }

  // IP Security Logs
  public async getIpLogs(params?: { limit?: number }) {
    const query = params?.limit !== undefined ? `?limit=${params.limit}` : '';
    const res = await this.request<{ success: boolean; data: IPSecurityLog[] }>(`/api/iplogs${query}`);
    return res.data;
  }

  public async deleteIpLogsRetention(days: number) {
    const res = await this.request<{ success: boolean; message: string }>('/api/iplogs/retention', {
      method: 'DELETE',
      body: JSON.stringify({ days })
    });
    return res;
  }

  // Administrative Boundaries
  public async getBoundaries() {
    const res = await this.request<{ success: boolean; data: AdministrativeBoundary[] }>('/api/locations/boundaries');
    return res.data;
  }

  // Geoanalytics distribution & hotspots
  public async getStateDistribution(params?: { from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/geoanalytics/state-distribution?${query.toString()}`);
    return res.data;
  }

  public async getDistrictDistribution(params?: { stateId?: string; from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.stateId) query.set('stateId', params.stateId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/geoanalytics/district-distribution?${query.toString()}`);
    return res.data;
  }

  public async getLocalityDistribution(params?: { districtId?: string; blockId?: string; from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.districtId) query.set('districtId', params.districtId);
    if (params?.blockId) query.set('blockId', params.blockId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/geoanalytics/locality-distribution?${query.toString()}`);
    return res.data;
  }

  public async getGeoHotspots(params?: { minReports?: string; radiusMeters?: string; from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.minReports) query.set('minReports', params.minReports);
    if (params?.radiusMeters) query.set('radiusMeters', params.radiusMeters);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/geoanalytics/hotspots?${query.toString()}`);
    return res.data;
  }

  // --- Map API Methods ---

  public async getMapReports() {
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>('/api/map/reports');
    return res.data;
  }

  public async getMapIncidents() {
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>('/api/map/incidents');
    return res.data;
  }

  public async getMapHotspots(params?: { minReports?: string; radiusMeters?: string }) {
    const query = new URLSearchParams();
    if (params?.minReports) query.set('minReports', params.minReports);
    if (params?.radiusMeters) query.set('radiusMeters', params.radiusMeters);
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>(`/api/map/hotspots?${query.toString()}`);
    return res.data;
  }

  public async getMapClusters() {
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>('/api/map/clusters');
    return res.data;
  }

  public async getMapBoundaries(params?: { level?: string }) {
    const query = params?.level ? `?level=${encodeURIComponent(params.level)}` : '';
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>(`/api/map/boundaries${query}`);
    return res.data;
  }

  public async getMapJurisdiction(lat: number, lng: number) {
    const res = await this.request<{ success: boolean; data: any }>(
      `/api/map/jurisdiction?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    );
    return res.data;
  }

  public async getMapStats() {
    const res = await this.request<{ success: boolean; data: any }>('/api/map/stats');
    return res.data;
  }

  public async getResolutionTimeByDistrict(params?: { from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/geoanalytics/resolution-time-by-district?${query.toString()}`);
    return res.data;
  }

  public async getPendingConcentration(params?: { from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/geoanalytics/pending-concentration?${query.toString()}`);
    return res.data;
  }

  public async getModelMetrics() {
    const res = await this.request<{ success: boolean; data: ModelEvaluationMetrics }>(
      '/api/intelligence/model-metrics'
    );
    return res.data;
  }

  public async getDatasetQuality() {
    const res = await this.request<{ success: boolean; data: any }>(
      '/api/intelligence/dataset-quality'
    );
    return res.data;
  }

  public async getSemanticEvaluation() {
    const res = await this.request<{ success: boolean; data: SemanticEvaluationResult }>(
      '/api/intelligence/semantic-evaluation'
    );
    return res.data;
  }

  // Dataset Pipeline
  public async getDatasetEntries(params?: { category?: string; split?: string; source?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.split) query.set('split', params.split);
    if (params?.source) query.set('source', params.source);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>(`/api/dataset?${query.toString()}`);
    return res.data;
  }

  public async getDatasetStats() {
    const res = await this.request<{ success: boolean; data: any }>('/api/dataset/stats');
    return res.data;
  }

  public async getDatasetVersions() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/dataset/versions');
    return res.data;
  }

  public async getDatasetVersion(version: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/dataset/versions/${encodeURIComponent(version)}`);
    return res.data;
  }

  public async addDatasetEntry(entry: { title: string; description: string; category: string; urgency: string; locationName: string; latitude: number; longitude: number; source?: string; split?: string }) {
    const res = await this.request<{ success: boolean; data: any }>('/api/dataset', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
    return res.data;
  }

  public async bulkAddDatasetEntries(entries: any[]) {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/dataset/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries })
    });
    return res.data;
  }

  public async updateDatasetEntry(id: string, updates: any) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/dataset/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res.data;
  }

  public async deleteDatasetEntry(id: string) {
    const res = await this.request<{ success: boolean }>(`/api/dataset/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res;
  }

  public async createDatasetVersion(version: string, notes?: string) {
    const res = await this.request<{ success: boolean; data: any }>('/api/dataset/versions', {
      method: 'POST',
      body: JSON.stringify({ version, notes })
    });
    return res.data;
  }

  public async evaluateModelOnDataset(modelVersion: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/dataset/evaluate/${encodeURIComponent(modelVersion)}`);
    return res.data;
  }

  public async generateSyntheticExamples(count: number, category?: string) {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/dataset/generate', {
      method: 'POST',
      body: JSON.stringify({ count, category })
    });
    return res.data;
  }

  public async exportDataset(format: 'json' | 'csv' = 'json') {
    const res = await this.request<{ success: boolean; data: string }>(`/api/dataset/export?format=${format}`, {
      method: 'GET'
    });
    return res.data;
  }

  // --- Image Intelligence ---

  public async uploadImage(payload: {
    dataUrl: string;
    source?: 'upload' | 'url' | 'camera';
    uploadedBy?: string;
    description?: string;
  }) {
    const res = await this.request<{ success: boolean; data: ImageUploadResult }>('/api/image/upload', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async getImageMetadata(imageId: string) {
    const res = await this.request<{ success: boolean; data: ImageMetadata }>(`/api/image/metadata/${encodeURIComponent(imageId)}`);
    return res.data;
  }

  public async analyzeImage(payload: { imageId?: string; dataUrl?: string; description?: string }) {
    const res = await this.request<{ success: boolean; data: { imageId: string; metadata: ImageMetadata; analysis: ImageAnalysis } }>(
      '/api/image/analyze',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  }

  public async getImage(imageId: string): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/image/${encodeURIComponent(imageId)}`, {
        headers,
        signal: controller.signal
      });
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      return { buffer, mimeType: res.headers.get('Content-Type') || 'application/octet-stream' };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --- Automated Reporting Engine ---

  public async getReportTemplates() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/reporting/templates');
    return res.data;
  }

  public async getReportTemplate(id: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/reporting/templates/${encodeURIComponent(id)}`);
    return res.data;
  }

  public async createReportTemplate(template: { name: string; description: string; type: string; format: string; frequency: string; recipients: string[]; departmentId?: string; filters?: any; schedule: any; isActive?: boolean }) {
    const res = await this.request<{ success: boolean; data: any }>('/api/reporting/templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
    return res.data;
  }

  public async updateReportTemplate(id: string, updates: any) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/reporting/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res.data;
  }

  public async deleteReportTemplate(id: string) {
    const res = await this.request<{ success: boolean }>(`/api/reporting/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res;
  }

  public async generateReport(templateId: string, options?: { format?: string; filters?: any }) {
    const res = await this.request<{ success: boolean; data: any }>('/api/reporting/generate', {
      method: 'POST',
      body: JSON.stringify({ templateId, ...options })
    });
    return res.data;
  }

  public async getGeneratedReports(templateId?: string, limit?: number, offset?: number) {
    const query = new URLSearchParams();
    if (templateId) query.set('templateId', templateId);
    if (limit) query.set('limit', String(limit));
    if (offset) query.set('offset', String(offset));
    const res = await this.request<{ success: boolean; data: any[]; meta: any }>(`/api/reporting/generated?${query.toString()}`);
    return res.data;
  }

  public async getGeneratedReport(id: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/reporting/generated/${encodeURIComponent(id)}`);
    return res.data;
  }

  public async downloadGeneratedReport(id: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/reporting/generated/${encodeURIComponent(id)}/download`);
    return res.data;
  }

  public async deleteGeneratedReport(id: string) {
    const res = await this.request<{ success: boolean }>(`/api/reporting/generated/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res;
  }

  public async processScheduledReports() {
    const res = await this.request<{ success: boolean }>('/api/reporting/process-scheduled', {
      method: 'POST'
    });
    return res;
  }

  // Notifications
  public async getNotifications(filters?: {
    eventType?: string;
    channels?: string[];
    priority?: string;
    read?: boolean;
    dateFrom?: string;
    dateTo?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ success: boolean; data: any[] }>(`/api/notifications${query}`);
    return res;
  }

  public async getNotificationStats() {
    const res = await this.request<{ success: boolean; data: any }>('/api/notifications/stats');
    return res;
  }

  public async getUnreadCount() {
    const res = await this.request<{ success: boolean; data: { unread: number } }>('/api/notifications/unread-count');
    return res;
  }

  public async getNotificationTemplates() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/notifications/templates');
    return res;
  }

  public async getNotificationTemplate(eventType: string) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/notifications/templates/${encodeURIComponent(eventType)}`);
    return res;
  }

  public async createNotificationTemplate(template: any) {
    const res = await this.request<{ success: boolean; data: any }>('/api/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
    return res;
  }

  public async updateNotificationTemplate(id: string, updates: any) {
    const res = await this.request<{ success: boolean; data: any }>(`/api/notifications/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res;
  }

  public async deleteNotificationTemplate(id: string) {
    const res = await this.request<{ success: boolean }>(`/api/notifications/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res;
  }

  public async getNotificationPreferences() {
    const res = await this.request<{ success: boolean; data: any }>('/api/notifications/preferences');
    return res;
  }

  public async updateNotificationPreferences(preferences: any) {
    const res = await this.request<{ success: boolean; data: any }>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
    return res;
  }

  public async sendNotification(notification: any) {
    const res = await this.request<{ success: boolean; data: any }>('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify(notification)
    });
    return res;
  }

  public async sendBulkNotifications(requests: any[]) {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/notifications/send-bulk', {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
    return res;
  }

  public async triggerNotificationEvent(eventType: string, data: any) {
    const res = await this.request<{ success: boolean }>('/api/notifications/trigger', {
      method: 'POST',
      body: JSON.stringify({ eventType, data })
    });
    return res;
  }

  public async markNotificationAsRead(id: string) {
    const res = await this.request<{ success: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    });
    return res;
  }

  public async markAllNotificationsAsRead() {
    const res = await this.request<{ success: boolean; data: { count: number } }>('/api/notifications/read-all', {
      method: 'POST'
    });
    return res;
  }

  public async deleteNotification(id: string) {
    const res = await this.request<{ success: boolean }>(`/api/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res;
  }

  public async processScheduledNotifications() {
    const res = await this.request<{ success: boolean; data: { processed: number } }>('/api/notifications/process-scheduled', {
      method: 'POST'
    });
    return res;
  }
}

export const api = new APIClient();
