// SCIP Government Portal - Main Header
// Professional Indian Government Digital Portal Aesthetic inspired by MyGov.in
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/apiClient';
import { Notification, UserRole } from '../../types/scip';
import {
  Search,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Shield,
  CheckCircle,
  FileText,
  AlertTriangle,
  Building2,
  Sparkles
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface GovernmentHeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  language: 'EN' | 'HI';
}

export const GovernmentHeader: React.FC<GovernmentHeaderProps> = ({
  currentTab,
  onNavigate,
  onOpenAuth,
  language
}) => {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toUpperCase();
    if (q.startsWith('REP') || q.startsWith('INC')) {
      onNavigate('track-report');
    } else {
      onNavigate('departments');
    }
  };

  return (
    <header className="bg-white border-b border-[#DCE3EA] py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: SCIP Crest & Government Portal Wordmark */}
        <div
          className="flex items-center gap-3 sm:gap-4 cursor-pointer select-none"
          onClick={() => onNavigate('home')}
        >
          {/* Custom SCIP Civic Crest / Insignia */}
          <div className="w-12 h-12 rounded-xl bg-[#153E63] text-white flex flex-col items-center justify-center p-1 border-2 border-[#1F5F91] shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#E89B36]" />
            <Shield className="w-5 h-5 text-[#E89B36] mb-0.5" />
            <span className="font-extrabold text-[10px] tracking-wider leading-none">SCIP</span>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#28834A]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#153E63] tracking-tight leading-none">
                SCIP
              </span>
              <span className="text-xs px-2 py-0.5 font-bold uppercase rounded bg-[#EAF2F8] text-[#1F5F91] border border-[#DCE3EA]">
                {t('header.gov_edition', 'Government Edition')}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#253443] tracking-tight leading-tight mt-1">
              {t('util.platform_title', 'Smart Community Intelligence Platform')}
            </div>
            <div className="text-[11px] text-[#657586] font-medium leading-none mt-0.5">
              {t('header.tagline', 'Connecting Communities · Enabling Better Governance')}
            </div>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-[#657586] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('header.search_placeholder', 'Search services or report reference (e.g. REP-...)')}
              className="w-full pl-9 pr-20 py-2 text-xs bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg text-[#253443] placeholder-[#657586] focus:bg-white focus:border-[#1F5F91] focus:outline-hidden transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded transition-colors"
            >
              {t('header.search_btn', 'Search')}
            </button>
          </form>
        </div>

{/* Right: Quick Role Persona Switcher, Notifications & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Notification Center */}
                <NotificationBell />

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[#F5F7FA] border border-[#DCE3EA] transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-md bg-[#153E63] text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden xl:block text-left text-xs">
                    <div className="font-semibold text-[#253443] leading-none">{user.name}</div>
                    <div className="text-[10px] text-[#1F5F91] font-bold uppercase mt-1 leading-none">
                      {role}
                    </div>
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#DCE3EA] py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-[#DCE3EA]">
                      <div className="text-xs font-bold text-[#153E63]">{user.name}</div>
                      <div className="text-[11px] text-[#657586] truncate">{user.email}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EAF2F8] text-[#1F5F91]">
                        {role} account
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate(role === 'citizen' ? 'my-reports' : 'admin-panel');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#253443] hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#657586]" />
                      <span>Citizen Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('track-report');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#253443] hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#657586]" />
                      <span>Track Submissions</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                        onNavigate('home');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#B42318] hover:bg-[#FDF2F2] flex items-center gap-2 border-t border-[#DCE3EA] cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#153E63] hover:text-[#1F5F91] hover:bg-[#EAF2F8] rounded-md border border-[#DCE3EA] transition-colors cursor-pointer"
              >
                {t('header.login_btn', 'Citizen Login')}
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth('signup')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-md shadow-xs transition-colors cursor-pointer"
              >
                {t('header.register_btn', 'Register')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
