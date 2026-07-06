import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ReactNode } from "react";
import "./KpiCard.css";

interface Props {
  title: string;
  value: string | number;
  icon?: ReactNode;
  tone?: "brass" | "alert" | "good" | "ink";
  change?: string;
  trend?: "up" | "down";
}

const TONE_CLASS: Record<string, string> = {
  brass: "kpi-icon kpi-icon-brass",
  alert: "kpi-icon kpi-icon-alert",
  good: "kpi-icon kpi-icon-good",
  ink: "kpi-icon kpi-icon-ink",
};

export default function KpiCard({
  title,
  value,
  icon,
  tone = "brass",
  change = "+12%",
  trend = "up",
}: Props) {
  const Trend = trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      className="card kpi-card"
    >
      <div className="kpi-top">
        <div>
          <p className="kpi-title mono">{title}</p>
          <h2 className="kpi-value">{value}</h2>
        </div>
        {icon && <div className={TONE_CLASS[tone]}>{icon}</div>}
      </div>

      <div className={`kpi-trend kpi-trend-${trend}`}>
        <Trend size={15} strokeWidth={2} />
        <span>{change} from last week</span>
      </div>
    </motion.div>
  );
}
