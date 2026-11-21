// SCIP Government Portal - Footer
import React from 'react';
import { Shield, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';

interface GovernmentFooterProps {
  onNavigate: (tab: string) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const GovernmentFooter: React.FC<GovernmentFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#112E4A] text-slate-300 border-t-4 border-[#E89B36] pt-12 pb-6 text-xs mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#153E63] text-white flex flex-col items-center justify-center p-1 border border-[#1F5F91]">
                <Shield className="w-4 h-4 text-[#E89B36]" />
                <span className="font-extrabold text-[9px] tracking-wider leading-none">SCIP</span>
              </div>
              <div>
                <div className="font-black text-white text-base leading-none">SCIP</div>
                <div className="text-[10px] text-[#E89B36] font-semibold mt-0.5">
                  Community Intelligence Platform
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Smart Community Intelligence Platform supports community reporting, incident review, and transparent decision support for authorized civic operations.
            </p>
            <div className="p-3 bg-[#153E63]/70 rounded-lg border border-[#1F5F91] text-[11px] space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#28834A]" />
                <span>Transparent civic workflow</span>
              </div>
              <p className="text-slate-300 text-[10px]">
                From community observation to authorized human review and action.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#1E4E7A] pb-2">
              Public Information
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li><button onClick={() => onNavigate('about')} className="hover:text-[#E89B36] transition-colors text-left">About SCIP</button></li>
              <li><button onClick={() => onNavigate('features')} className="hover:text-[#E89B36] transition-colors text-left">Features</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-[#E89B36] transition-colors text-left">How It Works</button></li>
              <li><button onClick={() => onNavigate('community-reporting')} className="hover:text-[#E89B36] transition-colors text-left">Community Reporting</button></li>
              <li><button onClick={() => onNavigate('ai-intelligence')} className="hover:text-[#E89B36] transition-colors text-left">AI Intelligence</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#1E4E7A] pb-2">
              Citizen Services
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li><button onClick={() => onNavigate('submit-report')} className="hover:text-[#E89B36] transition-colors text-left">Submit a Report</button></li>
              <li><button onClick={() => onNavigate('track-report')} className="hover:text-[#E89B36] transition-colors text-left">Track Report Status</button></li>
              <li><button onClick={() => onNavigate('departments')} className="hover:text-[#E89B36] transition-colors text-left">Departments Directory</button></li>
              <li><button onClick={() => onNavigate('help-support')} className="hover:text-[#E89B36] transition-colors text-left">Help and Support</button></li>
              <li><button onClick={() => onNavigate('faq')} className="hover:text-[#E89B36] transition-colors text-left">FAQ</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#1E4E7A] pb-2">
              Contact & Policies
            </h4>
            <div className="space-y-2.5 text-[11px] text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#E89B36] shrink-0 mt-0.5" />
                <span>Contact information available on the Contact page.</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#E89B36] shrink-0" />
                <span>See Contact page for helpdesk details.</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#E89B36] shrink-0" />
                <button onClick={() => onNavigate('contact')} className="hover:text-[#E89B36]">View contact options</button>
              </div>
            </div>
            <ul className="space-y-2 text-[11px] text-slate-400 pt-1">
              <li><button onClick={() => onNavigate('privacy-policy')} className="hover:text-[#E89B36] transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-[#E89B36] transition-colors text-left">Terms and Conditions</button></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1E4E7A] pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => onNavigate('privacy-policy')} className="hover:text-white">Privacy Policy</button>
            <span>·</span>
            <button onClick={() => onNavigate('terms')} className="hover:text-white">Terms and Conditions</button>
            <span>·</span>
            <button onClick={() => onNavigate('help-support')} className="hover:text-white">Help and Support</button>
            <span>·</span>
            <button onClick={() => onNavigate('faq')} className="hover:text-white">FAQ</button>
          </div>
          <div className="text-slate-400 text-[10px]">
            Smart Community Intelligence Platform
          </div>
        </div>

        <div className="border-t border-[#1A456E] pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
          <div>© 2026 Smart Community Intelligence Platform (SCIP).</div>
          <div>Human-reviewed decision support; AI outputs are advisory.</div>
        </div>
      </div>
    </footer>
  );
};
