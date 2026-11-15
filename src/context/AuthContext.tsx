// SCIP - Auth Context & Permission Hooks (Phase 3.1: Clerk migration)
// Clerk is the Identity Provider; SCIP remains the application data source and RBAC authority.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermission } from '../types/scip';
import { api } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: UserPermission) => boolean;
  // Verification (email via Clerk, SMS via SCIP)
  emailVerified: boolean;
  phoneVerified: boolean;
  sendSmsVerification: (phone: string) => Promise<void>;
  verifySms: (phone: string, otp: string) => Promise<void>;
  resendVerification: (channel: 'email' | 'sms') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  citizen: [
    'report.create',
    'report.read',
    'report.update',
    'incident.read',
    'feedback.create'
  ],
  officer: [
    'report.read',
    'incident.read',
    'incident.update',
    'inspection.create',
    'inspection.read'
  ],
  dept_officer: [
    'report.read',
    'report.update',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'incident.escalate',
    'inspection.verify',
    'inspection.read',
    'analytics.read',
    'data.export'
  ],
  analyst: [
    'report.read',
    'incident.read',
    'analytics.read',
    'intelligence.read',
    'model.evaluate',
    'data.export'
  ],
  authority: [
    'user.read',
    'report.read',
    'report.update',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'incident.escalate',
    'inspection.read',
    'analytics.read',
    'intelligence.read',
    'audit.read',
    'data.export'
  ],
  admin: [
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'incident.escalate',
    'inspection.create',
    'inspection.verify',
    'inspection.read',
    'feedback.create',
    'analytics.read',
    'intelligence.read',
    'audit.read',
    'model.evaluate',
    'data.export',
    'admin.manage'
  ]
};

function getClerkToken(): string | null {
  if (typeof window === 'undefined') return null;
  const clerk = (window as any).__scip_clerk__;
  if (clerk && typeof clerk.session?.getToken === 'function') {
    try {
      return clerk.session.getToken();
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchScipUser(): Promise<User | null> {
  const token = getClerkToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const emailVerified = Boolean(user?.emailVerified);
  const phoneVerified = Boolean(user?.phoneVerified);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const scipUser = await fetchScipUser();
      if (mounted) {
        setUser(scipUser);
        setIsLoading(false);
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, []);

  const login = async () => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    await clerk.signIn();
    const scipUser = await fetchScipUser();
    setUser(scipUser);
  };

  const register = async () => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    await clerk.signUp();
    const scipUser = await fetchScipUser();
    setUser(scipUser);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    api.setStoredUser(null);
  };

  const hasPermission = (permission: UserPermission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  const sendSmsVerification = async (phone: string) => {
    await api.sendSmsVerification(phone);
  };

  const verifySms = async (phone: string, otp: string) => {
    await api.verifySms(phone, otp);
  };

  const resendVerification = async (channel: 'email' | 'sms') => {
    await api.resendVerification(channel);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'citizen',
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        hasPermission,
        emailVerified,
        phoneVerified,
        sendSmsVerification,
        verifySms,
        resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
