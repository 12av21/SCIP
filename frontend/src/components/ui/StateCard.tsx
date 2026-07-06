import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  change?: string;
  positive?: boolean;
  color?: "blue" | "green" | "orange" | "red" | "purple";
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  positive = true,
  color = "blue",
}: StatCardProps) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl"
    >
      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-4xl font-black text-slate-900">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-sm text-slate-500">
              {subtitle}
            </p>
          )}

          {change && (
            <div
              className={`mt-4 flex items-center gap-1 font-semibold ${
                positive
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {positive ? (
                <ArrowUpRight size={18} />
              ) : (
                <ArrowDownRight size={18} />
              )}

              {change}
            </div>
          )}

        </div>

        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ${colors[color]}`}
        >
          <Icon size={30} />
        </div>

      </div>
    </motion.div>
  );
}