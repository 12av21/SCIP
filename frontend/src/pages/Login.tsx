import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, ShieldAlert, Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

type Portal = "citizen" | "admin";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [portal, setPortal] = useState<Portal>("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);

      // The portal toggle is just UX — the account's real role, returned by
      // the server, decides where they actually land.
      if (portal === "admin" && user.role !== "admin") {
        toast.error("This account doesn't have admin access. Redirecting to the citizen portal.");
        navigate("/citizen");
        return;
      }

      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === "admin" ? "/admin" : "/citizen");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Login failed. Check your credentials.";
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
          <h1 className="text-4xl font-display mb-2">Identify Yourself</h1>
          <p className="opacity-60 italic text-sm">Access the Smart Community Intelligence Platform</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setPortal("citizen")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors ${
              portal === "citizen" ? "bg-ink text-paper" : "bg-white border border-ink/10 opacity-60"
            }`}
          >
            <User size={16} /> Citizen Portal
          </button>
          <button
            type="button"
            onClick={() => setPortal("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors ${
              portal === "admin" ? "bg-ink text-paper" : "bg-white border border-ink/10 opacity-60"
            }`}
          >
            <ShieldAlert size={16} /> Authority Terminal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stamp-card p-6 space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={portal === "admin" ? "admin@scip.gov" : "you@example.com"}
              className="w-full border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-ink transition-colors font-medium"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper font-bold py-3.5 rounded-2xl hover:bg-brass transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {portal === "admin" && (
            <p className="text-[11px] text-center opacity-40 font-mono">
              demo admin: admin@scip.gov / Admin@123
            </p>
          )}
        </form>

        <p className="mt-8 text-center text-sm opacity-60">
          New here?{" "}
          <Link to="/register" className="font-bold text-ink hover:underline">
            Create a citizen account
          </Link>
        </p>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest opacity-30 font-mono">
          Secured by SCIP Neural Protocol
        </p>
      </div>
    </div>
  );
}
