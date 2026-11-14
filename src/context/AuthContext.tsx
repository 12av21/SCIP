// SCIP - Auth Context & Permission Hooks
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermission } from '../types/scip';
import { api } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; role?: UserRole; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  hasPermission: (permission: UserPermission) => boolean;
  // Verification
  emailVerified: boolean;
  phoneVerified: boolean;
  sendEmailVerification: (email: string) => Promise<void>;
  verifyEmail: (email: string, token: string) => Promise<void>;
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
    // Field Officer
    'report.read',
    'incident.read',
    'incident.update',
    'inspection.create',
    'inspection.read'
  ],
  dept_officer: [
    // Department Desk Officer
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
    // Data & AI Analyst
    'report.read',
    'incident.read',
    'analytics.read',
    'intelligence.read',
    'model.evaluate',
    'data.export'
  ],
  authority: [
    // Authority Director
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
    // Super Administrator
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verification state derived from user object
  const emailVerified = Boolean(user?.emailVerified);
  const phoneVerified = Boolean(user?.phoneVerified);

  useEffect(() => {
    // Initial user load from local storage if previously authenticated
    const storedUser = api.getStoredUser();
    const token = api.getToken();
    if (storedUser && token) {
      setUser(storedUser);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; password: string; role?: UserRole; phone?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    api.setStoredUser(null);
    api.setToken(null);
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(targetRole);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Verification methods ---

  const sendEmailVerification = async (email: string) => {
    await api.sendEmailVerification(email);
  };

  const verifyEmail = async (email: string, token: string) => {
    const res = await api.verifyEmail(email, token);
    // Refresh user data after verification
    if (res.success) {
      const me = await api.getStoredUser ? null : null;
      // User will be updated on next login or via status fetch
    }
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

  const hasPermission = (permission: UserPermission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
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
        switchDemoRole,
        hasPermission,
        emailVerified,
        phoneVerified,
        sendEmailVerification,
        verifyEmail,
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
