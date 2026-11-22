import React from 'react';
import { Layers, Search, MapPin, TrendingUp, ShieldCheck, FileText } from 'lucide-react';

interface PageProps { onNavigate: (tab: string) => void; }

export const FeaturesPage: React.FC<PageProps> = ({ onNavigate }) => {
  const features = [
    { icon: FileText, title: 'Community Reporting', desc: 'Submit civic observations with location details and supporting information through a structured intake process.' },
    { icon: Search, title: 'Report Tracking', desc: 'Track submitted reports by reference number to view current status and available updates.' },
    { icon: Layers, title: 'Incident Review', desc: 'Related observations can be reviewed together as incidents by authorized personnel for coordinated response.' },
    { icon: TrendingUp, title: 'Trend Analysis', desc: 'Authorized users can analyze patterns and recurrence across reports to support planning and prioritization.' },
    { icon: MapPin, title: 'Geospatial View', desc: 'Location-based views help visualize where reports and incidents are concentrated.' },
    { icon: ShieldCheck, title: 'Role-Based Access', desc: 'Citizens, officers, analysts, and administrators access capabilities appropriate to their roles.' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Platform Features</h1>
        <p className="text-sm text-[#657586] mt-1">Capabilities provided by the Smart Community Intelligence Platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div key={i} className="bg-white border border-[#DCE3EA] rounded-xl p-5 flex gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[#EAF2F8] text-[#1F5F91] flex items-center justify-center shrink-0">
              <f.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#153E63] text-sm">{f.title}</h3>
              <p className="text-xs text-[#657586] mt-1 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => onNavigate('how-it-works')} className="px-4 py-2 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg">How It Works</button>
        <button onClick={() => onNavigate('submit-report')} className="px-4 py-2 text-xs font-bold text-[#153E63] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg">Submit a Report</button>
      </div>
    </div>
  );
};
