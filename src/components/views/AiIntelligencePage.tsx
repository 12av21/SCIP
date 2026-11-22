import React from 'react';
import { Sparkles, ShieldCheck, Info } from 'lucide-react';

interface PageProps { onNavigate: (tab: string) => void; }

export const AiIntelligencePage: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">AI Intelligence</h1>
        <p className="text-sm text-[#657586] mt-1">How automated analysis supports decision-making in SCIP.</p>
      </div>

      <div className="bg-white border border-[#DCE3EA] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-[#153E63]"><Sparkles className="w-5 h-5 text-[#E89B36]" /> Decision Support</div>
        <p className="text-sm text-[#657586] leading-relaxed">
          SCIP may use automated analysis to assist with tasks such as categorizing reports, identifying related observations, highlighting patterns, and supporting prioritization. These outputs are intended to help authorized users review information more efficiently.
        </p>
      </div>

      <div className="bg-white border border-[#DCE3EA] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-[#153E63]"><ShieldCheck className="w-5 h-5 text-[#28834A]" /> Human Review</div>
        <p className="text-sm text-[#657586] leading-relaxed">
          Automated outputs are advisory and may be incomplete or incorrect. Final decisions, confirmations, and actions are made by authorized personnel through established review processes.
        </p>
      </div>

      <div className="p-4 bg-[#EAF2F8] border border-[#DCE3EA] rounded-xl text-xs text-[#253443] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#1F5F91] shrink-0 mt-0.5" />
        <p><strong>Transparency:</strong> Where analysis results are shown, the platform aims to present them clearly. Users should treat automated assessments as supporting information, not as definitive determinations.</p>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onNavigate('features')} className="px-4 py-2 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg">View Features</button>
        <button onClick={() => onNavigate('how-it-works')} className="px-4 py-2 text-xs font-bold text-[#153E63] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg">How It Works</button>
      </div>
    </div>
  );
};
