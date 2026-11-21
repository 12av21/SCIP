import React from 'react';
import { HelpCircle, Search, FileText, AlertTriangle } from 'lucide-react';

interface PageProps { onNavigate: (tab: string) => void; }

export const HelpSupportPage: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Help and Support</h1>
        <p className="text-sm text-[#657586] mt-1">Guidance for using the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><FileText className="w-4 h-4 text-[#1F5F91]" /> Submitting a report</div>
          <p className="text-xs text-[#657586] leading-relaxed">Provide a clear description and location. Attach photos if safe and relevant.</p>
          <button onClick={() => onNavigate('submit-report')} className="text-xs font-semibold text-[#1F5F91] hover:underline">Go to Submit Report</button>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><Search className="w-4 h-4 text-[#1F5F91]" /> Tracking a report</div>
          <p className="text-xs text-[#657586] leading-relaxed">Use the reference number provided at submission to check status and available updates.</p>
          <button onClick={() => onNavigate('track-report')} className="text-xs font-semibold text-[#1F5F91] hover:underline">Go to Track Report</button>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><HelpCircle className="w-4 h-4 text-[#1F5F91]" /> Frequently asked questions</div>
          <p className="text-xs text-[#657586] leading-relaxed">Find answers to common questions about reporting and tracking.</p>
          <button onClick={() => onNavigate('faq')} className="text-xs font-semibold text-[#1F5F91] hover:underline">View FAQ</button>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><HelpCircle className="w-4 h-4 text-[#1F5F91]" /> Contact</div>
          <p className="text-xs text-[#657586] leading-relaxed">See available contact options provided by the deploying organization.</p>
          <button onClick={() => onNavigate('contact')} className="text-xs font-semibold text-[#1F5F91] hover:underline">Contact page</button>
        </div>
      </div>

      <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#991B1B] flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p><strong>Emergency:</strong> For immediate danger to life or property, contact local emergency services. Do not rely on this platform for emergency response.</p>
      </div>
    </div>
  );
};
