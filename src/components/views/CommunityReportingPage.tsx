import React from 'react';
import { Camera, MapPin, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PageProps { onNavigate: (tab: string) => void; }

export const CommunityReportingPage: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Community Reporting</h1>
        <p className="text-sm text-[#657586] mt-1">How to submit clear and useful civic observations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><FileText className="w-4 h-4 text-[#1F5F91]" /> Describe the issue</div>
          <p className="text-xs text-[#657586] leading-relaxed">Provide a clear title and description of what you observed, including any relevant details such as severity or impact.</p>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><MapPin className="w-4 h-4 text-[#1F5F91]" /> Specify the location</div>
          <p className="text-xs text-[#657586] leading-relaxed">Use the map, GPS, or a written description to identify where the issue is located so it can be reviewed accurately.</p>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><Camera className="w-4 h-4 text-[#1F5F91]" /> Add supporting evidence</div>
          <p className="text-xs text-[#657586] leading-relaxed">If available and safe to capture, attach photographs that help document the observation.</p>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><CheckCircle2 className="w-4 h-4 text-[#1F5F91]" /> Track your submission</div>
          <p className="text-xs text-[#657586] leading-relaxed">After submission, keep your reference number to track status and updates.</p>
        </div>
      </div>

      <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#991B1B] flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p><strong>Emergency situations:</strong> If there is immediate danger to life or property, contact your local emergency services immediately. This platform is not a substitute for emergency response.</p>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onNavigate('submit-report')} className="px-4 py-2 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg">Submit a Report</button>
        <button onClick={() => onNavigate('track-report')} className="px-4 py-2 text-xs font-bold text-[#153E63] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg">Track a Report</button>
      </div>
    </div>
  );
};
