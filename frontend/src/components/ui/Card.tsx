import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        transition: {
          duration: 0.2,
        },
      }}
      className={`
        rounded-3xl
        border
        border-slate-200
        bg-white
        shadow-sm
        hover:shadow-xl
        transition-all
        duration-300
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}