// SCIP - Clerk Identity Linking Modal (Phase 3.1.3)
// Minimal, self-contained bootstrap UI for a Clerk-signed-in user whose SCIP
// account is not yet linked. Talks only to the linking API (Clerk-token auth);
// it never handles passwords and never reveals whether a claimed account exists.
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';
import { ShieldCheck, X, AlertCircle, CheckCircle2, Loader2, Link2, Mail } from 'lucide-react';

type LinkStatus = 'UNKNOWN' | 'NOT_LINKED' | 'PENDING' | 'LINKED';

function clerkSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const clerk = (window as any).__scip_clerk__;
  if (!clerk) return false;
  try {
    return Boolean(clerk.session || clerk.user);
  } catch {
    return false;
  }
}

export const AccountLinkingModal: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LinkStatus>('UNKNOWN');
  const [linkId, setLinkId] = useState<string | undefined>(undefined);
  const [challengePending, setChallengePending] = useState(false);
  const [method, setMethod] = useState<'ONE_TIME_CHALLENGE' | 'ADMIN_APPROVED'>('ONE_TIME_CHALLENGE');
  const [email, setEmail] = useState('');
  const [scipUserId, setScipUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await api.getAccountLinkStatus();
      const d: any = (res as any).data || {};
      if (d.status === 'LINKED') { setStatus('LINKED'); setOpen(false); return; }
      if (d.status === 'NOT_LINKED' || !d.status) { setStatus('NOT_LINKED'); return; }
      setStatus('PENDING');
      setLinkId(d.id);
      setChallengePending(Boolean(d.challengePending));
      if (d.verificationMethod) setMethod(d.verificationMethod);
    } catch {
      setStatus('NOT_LINKED');
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) { setOpen(false); return; }
    if (clerkSignedIn()) {
      setOpen(true);
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  if (!open) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!scipUserId.trim() && !email.trim()) {
      setError('Enter your registered email address or SCIP user ID.');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { verificationMethod: method };
      if (scipUserId.trim()) payload.scipUserId = scipUserId.trim();
      else payload.email = email.trim();
      await api.requestAccountLink(payload);
      setSuccess('If the account exists and is eligible, a linking request has been created.');
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit the linking request.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!linkId) { setError('No active linking request found.'); return; }
    if (otp.trim().length !== 6) { setError('Enter the 6-digit verification code.'); return; }
    setLoading(true);
    try {
      await api.submitAccountLinkChallenge(linkId, otp.trim());
      setSuccess('Your account has been linked. Reloading…');
      setTimeout(() => window.location.reload(), 900);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!linkId) return;
    setLoading(true);
    try {
      await api.cancelAccountLink(linkId);
      setLinkId(undefined);
      setChallengePending(false);
      setSuccess('Linking request cancelled.');
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel the request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl border border-[#DCE3EA] w-full max-w-md overflow-hidden text-[#253443]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="linking-modal-title"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#E89B36] via-white to-[#28834A]" />
        <div className="px-6 py-4 border-b border-[#DCE3EA] flex items-center justify-between bg-[#F5F7FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#153E63] flex items-center justify-center text-white shadow-2xs">
              <Link2 className="w-4 h-4 text-[#E89B36]" />
            </div>
            <div>
              <h3 id="linking-modal-title" className="font-bold text-[#153E63] text-sm tracking-tight leading-none">
                Link Your SCIP Account
              </h3>
              <p className="text-[11px] text-[#657586] mt-0.5">Securely connect your Clerk sign-in to your SCIP account</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-[#657586] hover:text-[#153E63] rounded-md hover:bg-slate-200/50 transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-[#B42318] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-[#1B6B3A] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {status === 'NOT_LINKED' && (
            <form onSubmit={handleRequest} className="space-y-3.5">
              <div className="p-2.5 rounded-md bg-[#EAF2F8] border border-[#B9D5EB] text-[11px] text-[#153E63] flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1F5F91] shrink-0 mt-0.5" />
                <span>You are signed in with Clerk but no SCIP account is linked yet. Enter the email or user ID on your existing SCIP account to request a link.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Registered email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">or SCIP user ID</label>
                <input
                  type="text"
                  value={scipUserId}
                  onChange={e => setScipUserId(e.target.value)}
                  placeholder="USR-…"
                  className="w-full text-xs px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Verification method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                >
                  <option value="ONE_TIME_CHALLENGE">One-time code to my verified contact</option>
                  <option value="ADMIN_APPROVED">Administrator approval</option>
                </select>
                <p className="text-[10px] text-[#657586] mt-1">A one-time code is only sent to a contact channel already verified on your SCIP account.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                <span>{loading ? 'Submitting…' : 'Request Account Link'}</span>
              </button>
            </form>
          )}

          {status === 'PENDING' && (
            <div className="space-y-4">
              {challengePending ? (
                <form onSubmit={handleVerify} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#253443] mb-1">6-digit verification code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-xs px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-[#657586] mt-1">Enter the code sent to your verified contact on file.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{loading ? 'Verifying…' : 'Verify & Link'}</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 rounded-md bg-[#EAF2F8] border border-[#B9D5EB] text-[11px] text-[#153E63] flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1F5F91] shrink-0 mt-0.5" />
                  <span>Your request is pending administrator review. You will be able to sign in once it is approved.</span>
                </div>
              )}
              <button type="button" onClick={handleCancel} disabled={loading} className="text-xs text-[#657586] hover:text-[#153E63] underline">
                Cancel this request
              </button>
            </div>
          )}

          {status === 'UNKNOWN' && (
            <div className="flex items-center gap-2 text-xs text-[#657586]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking linking status…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};