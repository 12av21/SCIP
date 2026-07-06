import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      toast.error("Password reset token is missing.");
      navigate("/login");
    } else {
      setToken(resetToken);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      // The toast message is already handled by the AuthContext function
      navigate("/login"); // Redirect to login after successful reset
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to reset password. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper relative overflow-hidden">
      <div className="landing-grid-bg" />
      <div className="gemini-glow !top-1/2 !left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />

      <div className="max-w-md w-full px-6 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display mb-2">Reset Password</h1>
          <p className="opacity-60 italic text-sm">Enter your new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="stamp-card p-6 space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              className="w-full border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 outline-none focus:border-ink transition-colors font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="w-full border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-ink transition-colors font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper font-bold py-3.5 rounded-2xl hover:bg-brass transition-colors disabled:opacity-60"
          >
            {loading ? "Resetting password…" : "Reset Password"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm opacity-60">
          <Link to="/login" className="font-bold text-ink hover:underline flex items-center justify-center gap-1 mt-2">
            <CheckCircle2 size={14} /> Password Reset? Login Here
          </Link>
        </p>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest opacity-30 font-mono">
          Secured by SCIP Neural Protocol
        </p>
      </div>
    </div>
  );
}