import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  change?: string;
}

export default function KpiCard({
  title,
  value,
  icon,
  color = "text-blue-600",
  change = "+12%",
}: Props) {
  return (
    <motion.div
      whileHover={{
        y: -5,
        scale: 1.02,
      }}
      transition={{
        duration: 0.2,
      }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border border-slate-200"
    >
      <div className="flex justify-between items-center">

        <div>

          <p className="text-slate-500 text-sm font-medium">
            {title}
          </p>

          <h2 className={`text-5xl font-bold mt-3 ${color}`}>
            {value}
          </h2>

        </div>

        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
          {icon}
        </div>

      </div>

      <div className="flex items-center mt-6 text-green-600 text-sm">

        <ArrowUpRight size={16} />

        <span className="ml-1">
          {change} from last week
        </span>

      </div>

    </motion.div>
  );
}