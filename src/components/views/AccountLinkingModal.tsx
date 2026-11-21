// SCIP - Clerk Identity Linking Modal (Phase 3.1.3)
// Minimal, self-contained bootstrap UI for a Clerk-signed-in user whose SCIP
// account is not yet linked. Talks only to the linking API (Clerk-token auth);
// it never handles passwords and never reveals whether a claimed account exists.
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';
import { ShieldCheck, X, AlertCircle, CheckCircle2, Loader2, Link2, Mail, UserPlus, User } from 'lucide-react';

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

async function clerkSessionHealthy(): Promise<'active' | 'expired' | 'invalid' | 'none'> {
  if (typeof window === 'undefined') return 'none';
  const clerk = (window as any).__scip_clerk__;
  if (!clerk) return 'none';
  try {
    const session = clerk.session;
    if (!session) return 'none';
    if (typeof session.isExpired === 'function' && session.isExpired()) return 'expired';
    if (typeof session.getToken !== 'function') return 'invalid';
    const token = await session.getToken();
    if (!token || typeof token !== 'string' || token.trim().length === 0) return 'invalid';
    return 'active';
  } catch {
    return 'invalid';
  }
}

export const AccountLinkingModal: React.FC = () => {
  const { isLoading, isAuthenticated, onboardClerkCitizen } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LinkStatus>('UNKNOWN');
  const [sessionState, setSessionState] = useState<'active' | 'expired' | 'invalid' | 'none'>('none');
  const [linkId, setLinkId] = useState<string | undefined>(undefined);
  const [challengePending, setChallengePending] = useState(false);
  const [method, setMethod] = useState<'ONE_TIME_CHALLENGE' | 'ADMIN_APPROVED'>('ONE_TIME_CHALLENGE');
  const [email, setEmail] = useState('');
  const [scipUserId, setScipUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // New-user onboarding mode: the Clerk identity has no existing SCIP account.
  const [isNewUser, setIsNewUser] = useState(false);
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardAddress, setOnboardAddress] = useState('');

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
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('401') || /expired|invalid|Authentication token|reauth|session/i.test(msg)) {
        setSessionState('invalid');
        setStatus('NOT_LINKED');
        setError('Your authentication session is not valid. Please sign in again to continue.');
        return;
      }
      setStatus('NOT_LINKED');
    }
  };

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (isLoading) return;
      if (isAuthenticated) { setOpen(false); return; }
      if (!clerkSignedIn()) { setOpen(false); return; }
      const s = await clerkSessionHealthy();
      if (!mounted) return;
      setSessionState(s);
      if (s !== 'active') { setOpen(true); return; }
      setOpen(true);
      await refresh();
    };
    check();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  if (!open) return null;

  const clerkUser = (() => {
    try { return (window as any).__scip_clerk__?.user ?? null; } catch { return null; }
  })();
  const clerkEmailAddr = String(
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    ''
  ).trim();
  const clerkFullName = String(
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    clerkUser?.fullName ||
    ''
  ).trim();

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

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const emailToUse = (email || clerkEmailAddr || '').trim().toLowerCase();
    const nameToUse = (onboardName || clerkFullName || '').trim();
    if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      setError('A valid email address is required to create your SCIP account.');
      return;
    }
    if (!nameToUse) {
      setError('Your full name is required to create a SCIP account.');
      return;
    }
    if (nameToUse.length > 100) {
      setError('Name must be 100 characters or fewer.');
      return;
    }
    if (onboardPhone && onboardPhone.trim().length > 30) {
      setError('Phone must be 30 characters or fewer.');
      return;
    }
    setLoading(true);
    try {
      await onboardClerkCitizen({
        name: nameToUse,
        email: emailToUse,
        phone: onboardPhone.trim() || undefined,
        residenceAddress: onboardAddress.trim() || undefined
      });
      setSuccess('Your SCIP citizen account has been created.');
      setTimeout(() => window.location.reload(), 900);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('already exists') || msg.includes('already registered') || msg.includes('409')) {
        setError('An account with this email address already exists. Link your existing SCIP account instead.');
        setIsNewUser(false);
        return;
      }
      if (/verification|verify/i.test(msg)) {
        setError('Email verification is required before creating your SCIP account. Complete Clerk verification, then try again.');
        return;
      }
      setError(msg || 'Failed to create your SCIP account.');
    } finally {
      setLoading(false);
    }
  };

  const toggleNewUser = () => {
    setIsNewUser(v => !v);
    setError(null);
    setSuccess(null);
    if (!isNewUser) {
      if (!onboardName && clerkFullName) setOnboardName(clerkFullName);
      if (!email && clerkEmailAddr) setEmail(clerkEmailAddr);
    }
  };

  const handleReauthenticate = async () => {
    setError(null); setSuccess(null);
    try {
      const clerk = (window as any).__scip_clerk__;
      if (clerk && typeof clerk.openSignIn === 'function') {
        await clerk.openSignIn();
        return;
      }
      if (clerk && typeof clerk.redirectToSignIn === 'function') {
        await clerk.redirectToSignIn();
        return;
      }
      window.location.reload();
    } catch {
      window.location.reload();
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

          {sessionState !== 'active' && status !== 'PENDING' && (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-[#92400E] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {sessionState === 'expired'
                    ? 'Your Clerk session has expired. Please sign in again to continue.'
                    : sessionState === 'invalid'
                      ? 'Your authentication session is invalid or could not be verified. Please sign in again to continue.'
                      : 'No active Clerk session found. Please sign in to continue.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReauthenticate}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sign in again</span>
              </button>
            </div>
          )}

          {sessionState === 'active' && status === 'NOT_LINKED' && !isNewUser && (
            <form onSubmit={handleRequest} className="space-y-3.5">
              <div className="p-2.5 rounded-md bg-[#EAF2F8] border border-[#B9D5EB] text-[11px] text-[#153E63] flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1F5F91] shrink-0 mt-0.5" />
                <span>You are signed in with Clerk but no SCIP account is linked yet. Link an existing SCIP account, or create a new citizen account if you are new to SCIP.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Registered email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={clerkEmailAddr || 'name@example.com'}
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
                <p className="text-[10px] text-[#657586] mt-1">For existing members only. A one-time code is sent only to a contact channel already verified on your SCIP account.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                <span>{loading ? 'Submitting…' : 'Link Existing SCIP Account'}</span>
              </button>

              <div className="pt-2 border-t border-[#DCE3EA] text-center">
                <p className="text-[11px] text-[#657586] mb-1.5">New to SCIP?</p>
                <button
                  type="button"
                  onClick={toggleNewUser}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F5F91] hover:text-[#153E63]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create a new citizen account</span>
                </button>
              </div>
            </form>
          )}

          {sessionState === 'active' && status === 'NOT_LINKED' && isNewUser && (
            <form onSubmit={handleOnboard} className="space-y-3.5">
              <div className="p-2.5 rounded-md bg-[#EAF2F8] border border-[#B9D5EB] text-[11px] text-[#153E63] flex items-start gap-2">
                <UserPlus className="w-3.5 h-3.5 text-[#1F5F91] shrink-0 mt-0.5" />
                <span>Create your SCIP citizen profile using your verified Clerk identity. Your account will be created with the default citizen role only.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Full name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onboardName}
                    onChange={e => setOnboardName(e.target.value)}
                    placeholder={clerkFullName || 'Your full name'}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email || clerkEmailAddr}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={clerkEmailAddr || 'name@example.com'}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={onboardPhone}
                  onChange={e => setOnboardPhone(e.target.value)}
                  placeholder="Mobile number"
                  className="w-full text-xs px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">Residence address (optional)</label>
                <input
                  type="text"
                  value={onboardAddress}
                  onChange={e => setOnboardAddress(e.target.value)}
                  placeholder="Address"
                  className="w-full text-xs px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{loading ? 'Creating account…' : 'Create Citizen Account'}</span>
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={toggleNewUser}
                  className="text-xs text-[#657586] hover:text-[#153E63] underline"
                >
                  Back to linking an existing SCIP account
                </button>
              </div>
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