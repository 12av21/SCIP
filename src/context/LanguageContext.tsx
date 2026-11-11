// SCIP - Bilingual Indian Government Portal Language Context (English & Hindi)
// Adheres to Official Language Standards (Rajbhasha & MyGov.in accessibility)
import React, { createContext, useContext, useState } from 'react';

export type Language = 'EN' | 'HI';

const TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  // Navigation & Core Titles
  'nav.home': { en: 'Home', hi: 'होम' },
  'nav.citizen_services': { en: 'Citizen Services', hi: 'नागरिक सेवाएं' },
  'nav.file_grievance': { en: 'File Grievance', hi: 'शिकायत दर्ज करें' },
  'nav.my_grievances': { en: 'My Grievances', hi: 'मेरी शिकायतें' },
  'nav.track_grievance': { en: 'Track Grievance', hi: 'शिकायत की स्थिति' },
  'nav.departments': { en: 'Departments', hi: 'विभाग निर्देशिका' },
  'nav.citizen_charter': { en: 'Citizen Charter', hi: 'नागरिक अधिकार पत्र' },
  'nav.field_operations': { en: 'Field Operations', hi: 'फील्ड संचालन' },
  'nav.work_orders': { en: 'Work Orders', hi: 'कार्य आदेश' },
  'nav.dept_desk': { en: 'Department Desk', hi: 'विभागीय डेस्क' },
  'nav.incident_queue': { en: 'Incident Queue', hi: 'घटना कतार' },
  'nav.sla_trends': { en: 'SLA Trends', hi: 'एस.एल.ए. रुझान' },
  'nav.analytics_models': { en: 'Analytics & Models', hi: 'विश्लेषण व मॉडल' },
  'nav.trends_recurrence': { en: 'Trends & Recurrence', hi: 'रुझान व पुनरावृत्ति' },
  'nav.geospatial_map': { en: 'Geospatial Map', hi: 'भू-स्थानिक मानचित्र' },
  'nav.scip_agent': { en: 'Decision Agent', hi: 'निर्णय समर्थन एजेंट' },
  'nav.command_center': { en: 'Command Center', hi: 'कमांड सेंटर' },
  'nav.admin_governance': { en: 'Governance & Audit', hi: 'प्रशासन व ऑडिट' },
  'nav.system_audit': { en: 'System Audit', hi: 'प्रणाली ऑडिट' },

  // Utility Bar & Header
  'util.platform_title': { en: 'Smart Community Intelligence Platform', hi: 'स्मार्ट कम्युनिटी इंटेलिजेंस प्लेटफॉर्म' },
  'util.portal_subtitle': { en: 'Citizen Engagement & Municipal Decision Support Portal', hi: 'नागरिक सेवा एवं नगर निकाय निर्णय समर्थन पोर्टल' },
  'util.skip_content': { en: 'Skip to main content', hi: 'मुख्य सामग्री पर जाएं' },
  'util.screen_reader': { en: 'Screen Reader Access', hi: 'स्क्रीन रीडर सहायता' },
  'util.contrast_normal': { en: 'Normal', hi: 'सामान्य' },
  'util.contrast_high': { en: 'High Contrast', hi: 'उच्च कंट्रास्ट' },
  'util.helpline': { en: 'Helpline: 1912', hi: 'हेल्पलाइन: 1912' },
  'header.gov_edition': { en: 'Government Edition', hi: 'शासकीय संस्करण' },
  'header.tagline': { en: 'Connecting Communities · Enabling Better Governance', hi: 'समुदायों को जोड़ना · सुशासन को सशक्त बनाना' },
  'header.search_placeholder': { en: 'Search services, report ID (REP-...), or department...', hi: 'सेवाएं, शिकायत संख्या (REP-...) या विभाग खोजें...' },
  'header.search_btn': { en: 'Search', hi: 'खोजें' },
  'header.login_btn': { en: 'Citizen Login', hi: 'नागरिक लॉगिन' },
  'header.register_btn': { en: 'Register', hi: 'पंजीकरण' },
  'header.sign_out': { en: 'Sign Out', hi: 'लॉग आउट' },
  'header.notifications': { en: 'Official Notifications', hi: 'आधिकारिक सूचनाएं' },
  'header.mark_all_read': { en: 'Mark all read', hi: 'सभी पढ़े गए चिह्नित करें' },
  'header.switch_role': { en: 'Switch Role Persona', hi: 'भूमिका बदलें' },

  // Role Names
  'role.citizen': { en: 'Citizen', hi: 'नागरिक' },
  'role.officer': { en: 'Field Officer', hi: 'फील्ड अधिकारी' },
  'role.dept_officer': { en: 'Dept Desk Officer', hi: 'विभागीय डेस्क अधिकारी' },
  'role.analyst': { en: 'Data & AI Analyst', hi: 'डेटा एवं एआई विश्लेषक' },
  'role.authority': { en: 'Authority Director', hi: 'प्राधिकरण निदेशक' },
  'role.admin': { en: 'Super Administrator', hi: 'मुख्य प्रशासक' },

  // Categories
  'cat.water': { en: 'Water & Drainage', hi: 'जल एवं जल निकासी' },
  'cat.roads': { en: 'Roads & Traffic', hi: 'सड़क एवं यातायात' },
  'cat.sanitation': { en: 'Public Sanitation', hi: 'सार्वजनिक स्वच्छता' },
  'cat.power': { en: 'Power & Lighting', hi: 'विद्युत एवं प्रकाश व्यवस्था' },
  'cat.parks': { en: 'Parks & Environment', hi: 'उद्यान एवं पर्यावरण' },
  'cat.safety': { en: 'Structural Safety', hi: 'संरचनात्मक सुरक्षा' },
  'cat.health': { en: 'Public Health', hi: 'सार्वजनिक स्वास्थ्य' },
  'cat.noise': { en: 'Noise & Disturbance', hi: 'ध्वनि एवं उपद्रव नियंत्रण' },

  // Statuses
  'status.submitted': { en: 'Submitted', hi: 'दर्ज किया गया' },
  'status.processing': { en: 'Processing', hi: 'प्रक्रियाधीन' },
  'status.analyzed': { en: 'AI Analyzed', hi: 'ए.आई. विश्लेषित' },
  'status.linked': { en: 'Cluster Linked', hi: 'घटना से संबद्ध' },
  'status.under_review': { en: 'Under Review', hi: 'समीक्षाधीन' },
  'status.assigned': { en: 'Assigned', hi: 'आवंटित' },
  'status.in_progress': { en: 'In Progress', hi: 'प्रगति पर' },
  'status.resolved': { en: 'Resolved', hi: 'निवारित' },
  'status.closed': { en: 'Closed', hi: 'बंद' },
  'status.potential': { en: 'Potential Incident', hi: 'संभावित घटना' },
  'status.confirmed': { en: 'Confirmed', hi: 'पुष्टीकृत' },
  'status.dismissed': { en: 'Dismissed', hi: 'खारिज' },

  // General Actions
  'action.submit': { en: 'Submit', hi: 'जमा करें' },
  'action.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'action.refresh': { en: 'Refresh', hi: 'ताज़ा करें' },
  'action.filter': { en: 'Filter', hi: 'फ़िल्टर' },
  'action.export_csv': { en: 'Export CSV', hi: 'सीएसवी डाउनलोड करें' },
  'action.view_details': { en: 'View Details', hi: 'विवरण देखें' },
  'action.track': { en: 'Track Status', hi: 'स्थिति ट्रैक करें' },
  'action.feedback': { en: 'Provide Feedback', hi: 'प्रतिक्रिया दें' },
  'action.assign_officer': { en: 'Assign Field Officer', hi: 'फील्ड अधिकारी आवंटित करें' },
  'action.verify_inspection': { en: 'Verify Inspection', hi: 'निरीक्षण सत्यापित करें' },
  'action.escalate': { en: 'Escalate to P1', hi: 'P1 आपातकालीन स्तर पर भेजें' },
  'action.resolve_incident': { en: 'Record Resolution', hi: 'निवारण दर्ज करें' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('scip_lang');
      if (stored === 'HI' || stored === 'EN') return stored;
    }
    return 'EN';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scip_lang', lang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'HI' : 'EN');
  };

  const t = (key: string, defaultText?: string): string => {
    const item = TRANSLATIONS[key];
    if (item) {
      return language === 'HI' ? item.hi : item.en;
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
