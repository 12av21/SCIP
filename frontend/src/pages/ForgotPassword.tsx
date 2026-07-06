import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      // The toast message is already handled by the AuthContext function
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to send password reset link.";
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
          <h1 className="text-4xl font-display mb-2">Forgot Password?</h1>
          <p className="opacity-60 italic text-sm">Enter your email to receive a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="stamp-card p-6 space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-ink transition-colors font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper font-bold py-3.5 rounded-2xl hover:bg-brass transition-colors disabled:opacity-60"
          >
            {loading ? "Sending link…" : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm opacity-60">
          Remember your password?{" "}
          <Link to="/login" className="font-bold text-ink hover:underline flex items-center justify-center gap-1 mt-2">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </p>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest opacity-30 font-mono">
          Secured by SCIP Neural Protocol
        </p>
      </div>
    </div>
  );
}