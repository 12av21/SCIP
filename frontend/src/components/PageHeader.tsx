import { CalendarDays, Sparkles } from "lucide-react";
import "./PageHeader.css";

export default function PageHeader() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="page-header">
      <div className="page-header-row">
        <div>
          <h1>Welcome back</h1>
          <p className="page-header-sub">Smart Community Intelligence Platform</p>
          <div className="page-header-date">
            <CalendarDays size={16} strokeWidth={1.8} />
            <span>{today}</span>
          </div>
        </div>

        <div className="page-header-status">
          <Sparkles size={18} />
          <div>
            <p className="page-header-status-title">AI status</p>
            <p className="page-header-status-sub">Community monitoring active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
