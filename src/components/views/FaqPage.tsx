import React from 'react';

interface PageProps { onNavigate: (tab: string) => void; }

export const FaqPage: React.FC<PageProps> = ({ onNavigate }) => {
  const faqs = [
    { q: 'How do I submit a report?', a: 'Use the Submit Report page to provide a title, description, and location details. You can also attach photos if available and safe to capture.' },
    { q: 'How do I track my report?', a: 'Use the Track Grievance page and enter the reference number you received after submitting your report.' },
    { q: 'What information should I include?', a: 'Include a clear description of the issue, where it is located, and any relevant details that help reviewers understand the situation.' },
    { q: 'Does the platform use automated analysis?', a: 'SCIP may use automated analysis to support categorization and review. These outputs are advisory and subject to human review by authorized personnel.' },
    { q: 'What if I am in immediate danger?', a: 'If there is immediate danger to life or property, contact your local emergency services immediately. This platform is not a substitute for emergency response.' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Frequently Asked Questions</h1>
        <p className="text-sm text-[#657586] mt-1">Common questions about using SCIP.</p>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="bg-white border border-[#DCE3EA] rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-[#153E63] text-sm">{f.q}</h3>
            <p className="text-xs text-[#657586] mt-2 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => onNavigate('help-support')} className="px-4 py-2 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg">Help and Support</button>
        <button onClick={() => onNavigate('contact')} className="px-4 py-2 text-xs font-bold text-[#153E63] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg">Contact</button>
      </div>
    </div>
  );
};
