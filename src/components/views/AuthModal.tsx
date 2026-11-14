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

type AuthMode = 'login' | 'signup' | 'email-otp' | 'sms-otp' | 'verify-email' | 'verify-sms';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccessNavigate
}) => {
  const { login, register, switchDemoRole, emailVerified, phoneVerified, sendEmailVerification, verifyEmail, sendSmsVerification, verifySms, resendVerification } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Verification States
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [verifyEmailToken, setVerifyEmailToken] = useState('');
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
      onClose();
      const emailLower = loginEmail.toLowerCase();
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
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

    if (signupPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
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
      await register({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        phone: signupPhone || undefined
      });
      setSuccessMessage('Registration successful. Please verify your email address to activate your account.');
      setMode('verify-email');
      setVerifyEmailInput(signupEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  // --- Verification handlers ---

  const handleSendEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(verifyEmailInput)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendEmailVerification(verifyEmailInput);
      setSuccessMessage('Verification email sent. Please check your inbox.');
      setMode('verify-email');
      setResendChannel('email');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!verifyEmailToken.trim()) {
      setErrorMessage('Please enter the verification token.');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(verifyEmailInput, verifyEmailToken);
      setSuccessMessage('Email verified successfully! You can now sign in.');
      setMode('login');
      setLoginEmail(verifyEmailInput);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification token.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleQuickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await switchDemoRole(role);
      onClose();
      navigateForRole(role);
    } catch (err: any) {
      const msg = err?.message || 'Development demo login is unavailable.';
      setErrorMessage(
        msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('disabled')
          ? 'Demo role login is disabled. Use your assigned account credentials.'
          : msg
      );
    } finally {
      setLoading(false);
    }
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

              {/* Quick Persona Switcher */}
              <div className="pt-4 mt-4 border-t border-[#DCE3EA]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#657586] mb-2 flex items-center justify-between">
                  <span>Evaluation & Demo Quick-Login</span>
                  <span className="text-[10px] text-[#1F5F91] font-semibold">1-Click Role Switch</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('citizen')}
                    className="p-2 rounded-md border border-[#DCE3EA] hover:border-[#1F5F91] hover:bg-[#EAF2F8] text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-[#153E63]">Citizen</div>
                    <div className="text-[10px] text-[#657586]">Priya Sharma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('officer')}
                    className="p-2 rounded-md border border-[#DCE3EA] hover:border-[#1F5F91] hover:bg-[#EAF2F8] text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-[#153E63]">Field Officer</div>
                    <div className="text-[10px] text-[#657586]">Er. Vikram Sharma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('dept_officer')}
                    className="p-2 rounded-md border border-[#DCE3EA] hover:border-[#1F5F91] hover:bg-[#EAF2F8] text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-[#153E63]">Dept Desk</div>
                    <div className="text-[10px] text-[#657586]">Er. Sunita Patel</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('analyst')}
                    className="p-2 rounded-md border border-[#DCE3EA] hover:border-[#1F5F91] hover:bg-[#EAF2F8] text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-[#153E63]">Data Analyst</div>
                    <div className="text-[10px] text-[#657586]">Dr. Kavita Rao</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('authority')}
                    className="p-2 rounded-md border border-[#DCE3EA] hover:border-[#1F5F91] hover:bg-[#EAF2F8] text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-[#153E63]">Authority Dir</div>
                    <div className="text-[10px] text-[#657586]">Dr. Rajesh Gupta</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin')}
                    className="p-2 rounded-md border border-[#DCE3EA] hover:border-[#1F5F91] hover:bg-[#EAF2F8] text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-[#153E63]">System Admin</div>
                    <div className="text-[10px] text-[#657586]">Adarsh Verma</div>
                  </button>
                </div>
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
                  <label className="block text-xs font-semibold text-[#253443] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#253443] mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      placeholder="+91-98765-XXXXX"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                    />
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

          {/* MODE: EMAIL VERIFICATION SEND */}
          {mode === 'email-otp' && (
            <form onSubmit={handleSendEmailVerification} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={verifyEmailInput}
                    onChange={e => setVerifyEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                We'll send a verification link to your email address.
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
                    <span>Send Verification Email</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: EMAIL VERIFY */}
          {mode === 'verify-email' && (
            <form onSubmit={handleVerifyEmail} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#253443] mb-1">
                  Verification Token
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#657586] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={verifyEmailToken}
                    onChange={e => setVerifyEmailToken(e.target.value)}
                    placeholder="Paste verification link token here"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#DCE3EA] rounded-md text-[#253443] placeholder-[#657586]/60 focus:outline-hidden focus:border-[#1F5F91] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#657586]">
                Check your email for the verification link and paste the token here.
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
                    <span>Verify Email</span>
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
                {resendChannel === 'email' && resendCooldown > 0 && (
                  <span className="text-[10px] text-[#657586]">
                    Resend in {resendCooldown}s
                  </span>
                )}
                {resendChannel === 'email' && resendCooldown === 0 && (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs text-[#1F5F91] hover:text-[#153E63] underline"
                  >
                    Resend verification email
                  </button>
                )}
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
