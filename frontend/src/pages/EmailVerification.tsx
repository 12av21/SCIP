import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { MailCheck, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, sendVerificationEmail, user, isAuthenticated, loading: authLoading } = useAuth();

  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token && verificationStatus === 'idle') {
      handleVerifyEmail(token);
    } else if (!token && isAuthenticated && user && !user.isVerified) {
      // If user is logged in but not verified and no token in URL, prompt to send email
      setVerificationStatus('idle');
    } else if (isAuthenticated && user && user.isVerified) {
      // If already verified, redirect
      toast.success("Your email is already verified!");
      navigate(user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/citizen');
    }
  }, [searchParams, isAuthenticated, user, navigate, verificationStatus]);

  const handleVerifyEmail = async (token: string) => {
    setVerificationStatus('verifying');
    try {
      await verifyEmail(token);
      setVerificationStatus('success');
      toast.success("Email verified successfully! Redirecting to dashboard...");
      setTimeout(() => {
        navigate(user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/citizen');
      }, 2000);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Email verification failed. The link might be expired or invalid.";
      toast.error(message);
      setVerificationStatus('error');
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      await sendVerificationEmail();
      toast.success("New verification email sent! Please check your inbox.");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to resend verification email.";
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  if (authLoading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper relative overflow-hidden">
      <div className="landing-grid-bg" />
      <div className="gemini-glow !top-1/2 !left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />

      <div className="max-w-md w-full px-6 relative z-10 text-center">
        <div className="text-center mb-10">
          <MailCheck className="mx-auto text-brass mb-4" size={64} />
          <h1 className="text-4xl font-display mb-2">Verify Your Email</h1>
          <p className="opacity-60 italic text-sm">
            {verificationStatus === 'success'
              ? "Your email has been successfully verified!"
              : "A verification link has been sent to your email address. Please click the link to activate your account."}
          </p>
        </div>

        {verificationStatus === 'error' || (!searchParams.get("token") && isAuthenticated && user && !user.isVerified) ? (
          <button
            onClick={handleResendEmail}
            disabled={resendLoading}
            className="w-full bg-ink text-paper font-bold py-3.5 rounded-2xl hover:bg-brass transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {resendLoading ? <Loader2 className="animate-spin" size={20} /> : <MailCheck size={20} />}
            {resendLoading ? "Sending..." : "Resend Verification Email"}
          </button>
        ) : verificationStatus === 'verifying' ? (
          <p className="text-ink font-bold flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} /> Verifying your email...
          </p>
        ) : verificationStatus === 'success' ? (
          <Link to={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/citizen'} className="w-full bg-ink text-paper font-bold py-3.5 rounded-2xl hover:bg-brass transition-colors flex items-center justify-center gap-2">
            Go to Dashboard <ArrowRight size={20} />
          </Link>
        ) : (
          <p className="text-sm opacity-60">Waiting for verification...</p>
        )}

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest opacity-30 font-mono">
          Secured by SCIP Neural Protocol
        </p>
      </div>
    </div>
  );
}