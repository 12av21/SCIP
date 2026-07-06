import { motion } from "framer-motion";
import {
  Sparkles,
  Activity,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

export default function HeroBanner() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl"
    >
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-2">

        {/* Left */}

        <div>

          <div className="mb-5 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 w-fit backdrop-blur">

            <Sparkles className="text-cyan-300" size={18} />

            <span className="text-sm font-semibold">
              Gemini AI Enabled
            </span>

          </div>

          <h1 className="text-5xl font-black leading-tight">

            Smart Community

            <span className="block text-cyan-300">
              Intelligence Platform
            </span>

          </h1>

          <p className="mt-5 max-w-xl text-slate-300">

            AI-powered complaint management,
            predictive analytics,
            intelligent prioritization,
            and executive decision support
            for smart governance.

          </p>

          <div className="mt-8 flex gap-4">

            <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700">

              Generate Report

              <ArrowRight size={18} />

            </button>

            <button className="rounded-xl border border-white/20 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/10">

              Open AI Assistant

            </button>

          </div>

        </div>

        {/* Right */}

        <div className="grid grid-cols-2 gap-4">

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">

            <Activity className="mb-3 text-green-400" />

            <p className="text-sm text-slate-300">
              System Health
            </p>

            <h2 className="mt-2 text-4xl font-bold">
              98%
            </h2>

          </div>

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">

            <ShieldCheck className="mb-3 text-cyan-400" />

            <p className="text-sm text-slate-300">
              AI Confidence
            </p>

            <h2 className="mt-2 text-4xl font-bold">
              96%
            </h2>

          </div>

          <div className="col-span-2 rounded-2xl bg-white/10 p-5 backdrop-blur">

            <div className="flex items-center gap-3">

              <CalendarDays className="text-cyan-300" />

              <div>

                <p className="text-sm text-slate-300">
                  Today
                </p>

                <h3 className="font-semibold">
                  {today}
                </h3>

              </div>

            </div>

          </div>

        </div>

      </div>

    </motion.div>
  );
}