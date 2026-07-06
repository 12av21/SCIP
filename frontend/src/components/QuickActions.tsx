import {
  FilePlus2,
  BarChart3,
  Sparkles,
  Download,
} from "lucide-react";

const actions = [
  {
    title: "Submit Complaint",
    description: "Register a new community issue",
    icon: FilePlus2,
    color: "bg-blue-600",
  },
  {
    title: "Analytics",
    description: "View system insights",
    icon: BarChart3,
    color: "bg-emerald-600",
  },
  {
    title: "AI Analysis",
    description: "Generate recommendations",
    icon: Sparkles,
    color: "bg-violet-600",
  },
  {
    title: "Export Report",
    description: "Download executive report",
    icon: Download,
    color: "bg-orange-600",
  },
];

export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">
        Quick Actions
      </h2>

      <div className="space-y-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${action.color}`}
              >
                <Icon size={22} />
              </div>

              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-900">
                  {action.title}
                </p>

                <p className="text-sm text-slate-500">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}