import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function SectionHeader({
  title,
  subtitle,
  icon,
}: Props) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          {icon}

          <h2 className="text-2xl font-bold text-slate-900">
            {title}
          </h2>
        </div>

        {subtitle && (
          <p className="mt-1 text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}