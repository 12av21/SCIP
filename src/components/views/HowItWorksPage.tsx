import React from 'react';
import { FileText, Search, Layers, CheckCircle2, Users } from 'lucide-react';

interface PageProps { onNavigate: (tab: string) => void; }

export const HowItWorksPage: React.FC<PageProps> = ({ onNavigate }) => {
  const steps = [
    { icon: FileText, title: '1. Submit an Observation', desc: 'Citizens submit a report describing the issue, location, and any supporting details.' },
    { icon: Search, title: '2. Processing & Analysis', desc: 'Submitted reports are processed and may be analyzed to assist categorization and prioritization. Automated outputs are advisory.' },
    { icon: Layers, title: '3. Review & Coordination', desc: 'Authorized officers review reports and related information, and may group related observations for coordinated handling.' },
    { icon: Users, title: '4. Action & Updates', desc: 'Responsible departments take appropriate action based on human review. Status updates are recorded as work progresses.' },
    { icon: CheckCircle2, title: '5. Resolution & Tracking', desc: 'Citizens can track report status using their reference number to see available updates.' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">How It Works</h1>
        <p className="text-sm text-[#657586] mt-1">The process from community report submission to resolution.</p>
      </div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="bg-white border border-[#DCE3EA] rounded-xl p-5 flex gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[#EAF2F8] text-[#1F5F91] flex items-center justify-center shrink-0">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#153E63] text-sm">{s.title}</h3>
              <p className="text-xs text-[#657586] mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#EAF2F8] border border-[#DCE3EA] rounded-xl text-xs text-[#253443]">
        <strong>Note:</strong> Automated analysis supports, but does not replace, human review and decision-making by authorized personnel.
      </div>

      <div className="flex gap-3">
        <button onClick={() => onNavigate('community-reporting')} className="px-4 py-2 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg">Community Reporting</button>
        <button onClick={() => onNavigate('track-report')} className="px-4 py-2 text-xs font-bold text-[#153E63] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg">Track a Report</button>
      </div>
    </div>
  );
};
