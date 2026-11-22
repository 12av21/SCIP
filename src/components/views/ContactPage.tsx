import React from 'react';
import { Mail, Phone, MapPin, Info } from 'lucide-react';

interface PageProps { onNavigate: (tab: string) => void; }

export const ContactPage: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Contact</h1>
        <p className="text-sm text-[#657586] mt-1">How to get in touch regarding the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><Mail className="w-4 h-4 text-[#1F5F91]" /> Email</div>
          <p className="text-xs text-[#657586]">Contact details are configured by the deploying organization. Refer to your local deployment or administrator for official contact information.</p>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><Phone className="w-4 h-4 text-[#1F5F91]" /> Phone / Helpdesk</div>
          <p className="text-xs text-[#657586]">Helpdesk numbers and hours, if available, are provided by the deploying organization.</p>
        </div>
        <div className="bg-white border border-[#DCE3EA] rounded-xl p-5 space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-[#153E63] text-sm"><MapPin className="w-4 h-4 text-[#1F5F91]" /> Office / Address</div>
          <p className="text-xs text-[#657586]">Physical office address and service locations, if applicable, are provided by the deploying organization.</p>
        </div>
      </div>

      <div className="p-4 bg-[#EAF2F8] border border-[#DCE3EA] rounded-xl text-xs text-[#253443] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#1F5F91] shrink-0 mt-0.5" />
        <p>For report-related assistance, you can also use <button onClick={() => onNavigate('help-support')} className="text-[#1F5F91] font-semibold hover:underline">Help and Support</button> or <button onClick={() => onNavigate('track-report')} className="text-[#1F5F91] font-semibold hover:underline">Track a Report</button>.</p>
      </div>
    </div>
  );
};
