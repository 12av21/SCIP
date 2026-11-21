// SCIP - Official Citizen & Officer Authentication Modal (Government Digital Portal)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/scip.js';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  Loader2,
  Send,
  RefreshCw,
  Check
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccessNavigate?: (tab: string) => void;
}

type AuthMode = 'login' | 'signup' | 'email-otp' | 'email-code' | 'signup-email-code' | 'sms-otp' | 'verify-email' | 'verify-sms';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccessNavigate
}) => {
  const { login, register, verifySignupEmailCode, resendSignupEmailCode, sendLoginEmailCode, verifyLoginEmailCode, emailVerified, phoneVerified, sendSmsVerification, verifySms, resendVerification, isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // If already authenticated, close modal and navigate to the correct dashboard
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      onClose();
      if (onSuccessNavigate) {
        const role = (user as any)?.role || 'citizen';
        switch (role) {
          case 'field_officer':
          case 'officer':
            onSuccessNavigate('field-officer-dashboard');
            break;
          case 'dept_officer':
            onSuccessNavigate('dept-officer-dashboard');
            break;
          case 'analyst':
            onSuccessNavigate('analyst-dashboard');
            break;
          case 'authority':
            onSuccessNavigate('intel-dashboard');
            break;
          case 'admin':
            onSuccessNavigate('admin-panel');
            break;
          default:
            onSuccessNavigate('citizen-dashboard');
        }
      }
    }
  }, [isOpen, isAuthenticated, user]);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Email-code sign-in states
  const [emailOtpEmail, setEmailOtpEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');

  // Signup Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [signupEmailCode, setSignupEmailCode] = useState('');

  // Verification States
  const [verifyPhoneInput, setVerifyPhoneInput] = useState('');
  const [verifyOtpInput, setVerifyOtpInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendChannel, setResendChannel] = useState<'email' | 'sms' | null>(null);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const navigateForRole = (role: UserRole) => {
    if (!onSuccessNavigate) return;
    switch (role) {
      case 'citizen':
        onSuccessNavigate('citizen-dashboard');
        break;
      case 'officer':
        onSuccessNavigate('field-officer-dashboard');
        break;
      case 'dept_officer':
        onSuccessNavigate('dept-officer-dashboard');
        break;
      case 'analyst':
        onSuccessNavigate('analyst-dashboard');
        break;
      case 'authority':
        onSuccessNavigate('intel-dashboard');
        break;
      case 'admin':
        onSuccessNavigate('admin-panel');
        break;
      default:
        onSuccessNavigate('citizen-dashboard');
    }
  };

  const completeLogin = (email: string) => {
    onClose();
    const emailLower = email.toLowerCase();
    if (emailLower.includes('admin')) {
      navigateForRole('admin');
    } else if (emailLower.includes('director') || emailLower.includes('auth')) {
      navigateForRole('authority');
    } else if (emailLower.includes('dept') || emailLower.includes('desk')) {
      navigateForRole('dept_officer');
    } else if (emailLower.includes('analyst') || emailLower.includes('data')) {
      navigateForRole('analyst');
    } else if (emailLower.includes('officer')) {
      navigateForRole('officer');
    } else {
      navigateForRole('citizen');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      completeLogin(loginEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailOtpEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendLoginEmailCode(emailOtpEmail);
      setMode('email-code');
      setSuccessMessage('Verification code sent. Enter the 6-digit code to continue.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailOtpCode.trim() || emailOtpCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyLoginEmailCode(emailOtpCode);
      completeLogin(emailOtpEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!signupPassword) {
      setErrorMessage('Password is required.');
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (!signupConfirmPassword) {
      setErrorMessage('Please confirm your password.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Password and confirmation do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('You must accept the SCIP Terms of Service and Responsible AI Charter.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({ name: signupName, email: signupEmail, phone: signupPhone, password: signupPassword });
      if (result === 'complete') {
        setSuccessMessage('Registration successful. You can continue.');
        onClose();
        return;
      }
      setMode('signup-email-code');
      setSuccessMessage('Account created. Enter the email verification code sent by the authentication provider to complete registration.');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. An account with this email may already exist.';
      if (/missing_requirements|verification|verify|additional/i.test(msg)) {
        setMode('signup-email-code');
        setSuccessMessage('Account created, but additional verification is required. Enter the verification code sent to your email, then sign in if needed.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!signupEmailCode.trim() || signupEmailCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      await verifySignupEmailCode(signupEmailCode);
      setSuccessMessage('Email verified and registration completed.');
      navigateForRole('citizen');
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired verification code.';
      if (/additional verification|remaining|sign in/i.test(msg)) {
        setSuccessMessage(msg);
        setMode('login');
        setLoginEmail(signupEmail);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupEmailCode = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await resendSignupEmailCode();
      setSuccessMessage('Verification code resent to your email.');
      setResendChannel('email');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // --- Verification handlers ---

  const handleSendSmsVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const phoneRegex = /^(\+91|91|0)?[6-9][0-9]{9}$/;
    if (!phoneRegex.test(verifyPhoneInput.replace(/\s/g, ''))) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      await sendSmsVerification(verifyPhoneInput);
      setSuccessMessage('Verification SMS sent. Please check your messages.');
      setMode('verify-sms');
      setResendChannel('sms');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification SMS.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySms = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!verifyOtpInput.trim() || verifyOtpInput.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      await verifySms(verifyPhoneInput, verifyOtpInput);
      setSuccessMessage('Phone verified successfully! You can now sign in.');
      setMode('login');
      setLoginEmail(verifyPhoneInput);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendChannel) return;
    setLoading(true);
    try {
      await resendVerification(resendChannel);
      setResendCooldown(60);
      setSuccessMessage(`Verification ${resendChannel} resent.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification.');
    } finally {
      setLoading(false);
    }
  };

  const verificationStatusBadge = () => {
    const emailOk = emailVerified;
    const phoneOk = phoneVerified;
    if (emailOk && phoneOk) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-semibold">
          <Check className="w-3 h-3" /> Fully Verified
        </span>
      );
    }
    if (emailOk || phoneOk) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-700 text-[10px] font-semibold">
          <AlertCircle className="w-3 h-3" /> Partially Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-semibold">
        <AlertCircle className="w-3 h-3" /> Verification Required
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl border border-[#DCE3EA] w-full max-w-lg overflow-hidden text-[#253443]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Tricolor accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#E89B36] via-white to-[#28834A]" />

        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#DCE3EA] flex items-center justify-between bg-[#F5F7FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#153E63] flex items-center justify-center text-white font-bold text-sm shadow-2xs">
              <Shield className="w-4 h-4 text-[#E89B36]" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="font-bold text-[#153E63] text-sm tracking-tight leading-none">
                Smart Community Intelligence Platform
              </h3>
              <p className="text-[11px] text-[#657586] mt-0.5">
                Official Citizen & Civil Servant Identity Gateway
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#657586] hover:text-[#153E63] rounded-md hover:bg-slate-200/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-[#DCE3EA] flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'login'
                ? 'border-[#E89B36] text-[#153E63] font-bold'
                : 'border-transparent text-[#657586] hover:text-[#153E63]'
            }`}
          >
            Sign In to Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'signup'
                ? 'border-[#E89B36] text-[#153E63] font-bold'
                : 'border-transparent text-[#657586] hover:text-[#153E63]'
            }`}
          >
            Create Citizen Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-[#B42318] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="e.g. priya.sharma@scip.gov"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#253443]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#657586]">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full text-xs pl-9 pr-9 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#657586] hover:text-[#153E63]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#657586]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded text-[#1F5F91] focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Keep me signed in</span>
                </label>

                <span className="text-[11px] text-[#657586]">Encrypted with bcrypt</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to SCIP Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailOtpEmail(loginEmail);
                  setMode('email-otp');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-center text-[11px] text-[#1F5F91] hover:text-[#153E63] underline mt-1"
              >
                Use email verification code instead
              </button>

            </form>
          )}

          {/* MODE: EMAIL CODE SEND */}
          {mode === 'email-otp' && (
            <form onSubmit={handleSendEmailCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailOtpEmail}
                    onChange={e => setEmailOtpEmail(e.target.value)}
                    placeholder="e.g. admin+clerk_test@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                We'll email a 6-digit verification code to this address.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMessage(null); }}
                className="w-full text-center text-xs text-[#657586] hover:text-[#153E63]"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* MODE: EMAIL CODE VERIFY */}
          {mode === 'email-code' && (
            <form onSubmit={handleVerifyEmailCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={emailOtpCode}
                    onChange={e => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="424242"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all tracking-[0.3em]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                Enter the 6-digit code sent to <span className="font-semibold">{emailOtpEmail}</span>.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); }}
                  className="text-xs text-[#657586] hover:text-[#153E63]"
                >
                  Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleSendEmailCode()}
                  className="text-xs text-[#1F5F91] hover:text-[#153E63] underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* MODE: SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#253443] mb-1" htmlFor="signup-email">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#253443] mb-1" htmlFor="signup-phone">
                    Mobile Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-phone"
                      type="tel"
                      autoComplete="tel"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      placeholder="+91-98765-XXXXX"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#253443]" htmlFor="signup-password">
                      Password
                    </label>
                    <span className="text-[11px] text-[#657586]">Min. 8 characters</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full text-xs pl-9 pr-9 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#657586] hover:text-[#153E63]"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#253443] mb-1" htmlFor="signup-confirm-password">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-confirm-password"
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={signupConfirmPassword}
                      onChange={e => setSignupConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full text-xs pl-9 pr-9 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#657586] hover:text-[#153E63]"
                      aria-label={showSignupConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showSignupConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-[#EAF2F8] border border-[#B9D5EB] text-[11px] text-[#153E63] flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1F5F91] shrink-0 mt-0.5" />
                <span>Public registration always creates a <strong>Citizen</strong> account. Privileged member registration (Officer, Analyst, Authority, Admin) is restricted to authorized administrators via the Governance Console.</span>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-[#657586]">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="rounded text-[#1F5F91] focus:ring-0 w-3.5 h-3.5 mt-0.5"
                  />
                  <span>
                    I agree to the SCIP Municipal Terms of Service and Responsible AI Governance Charter.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: SIGNUP EMAIL VERIFY */}
          {mode === 'signup-email-code' && (
            <form onSubmit={handleVerifySignupEmailCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  6-Digit Email Verification Code
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={signupEmailCode}
                    onChange={e => setSignupEmailCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all tracking-[0.3em]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                Enter the code sent to <span className="font-semibold">{signupEmail || 'your email'}</span> to complete registration.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Email & Complete Registration</span>
                    <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); setLoginEmail(signupEmail); }}
                  className="text-xs text-[#657586] hover:text-[#153E63]"
                >
                  Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={handleResendSignupEmailCode}
                  disabled={loading || resendCooldown > 0}
                  className="text-xs text-[#1F5F91] hover:text-[#153E63] underline disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* MODE: SMS VERIFICATION SEND */}
          {mode === 'sms-otp' && (
            <form onSubmit={handleSendSmsVerification} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  Mobile Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={verifyPhoneInput}
                    onChange={e => setVerifyPhoneInput(e.target.value)}
                    placeholder="+91-98765-XXXXX"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                We'll send a 6-digit OTP to your phone number.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification SMS</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: SMS VERIFY */}
          {mode === 'verify-sms' && (
            <form onSubmit={handleVerifySms} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  6-Digit OTP
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={verifyOtpInput}
                    onChange={e => setVerifyOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                Enter the 6-digit OTP sent to your phone.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:bg-slate-300 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Phone</span>
                    <Check className="w-3 h-3" />
                  </>
                )}
              </button>
              <div className="pt-2 mt-2 border-t border-[#DCE3EA] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); }}
                  className="text-xs text-[#657586] hover:text-[#153E63]"
                >
                  Back to Sign In
                </button>
                {resendChannel === 'sms' && resendCooldown > 0 && (
                  <span className="text-[10px] text-[#657586]">
                    Resend in {resendCooldown}s
                  </span>
                )}
                {resendChannel === 'sms' && resendCooldown === 0 && (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs text-[#1F5F91] hover:text-[#153E63] underline"
                  >
                    Resend verification SMS
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
