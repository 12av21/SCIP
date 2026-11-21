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
  login: (email: string, password: string) => Promise<void>;
  sendLoginEmailCode: (email: string) => Promise<void>;
  verifyLoginEmailCode: (code: string) => Promise<void>;
  register: (params: { name: string; email: string; phone?: string; password: string }) => Promise<'complete' | 'verification_required'>;
  verifySignupEmailCode: (code: string) => Promise<void>;
  resendSignupEmailCode: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: UserPermission) => boolean;
  // Verification (email via Clerk, SMS via SCIP)
  emailVerified: boolean;
  phoneVerified: boolean;
  sendSmsVerification: (phone: string) => Promise<void>;
  verifySms: (phone: string, otp: string) => Promise<void>;
  resendVerification: (channel: 'email' | 'sms') => Promise<void>;
  /**
   * Secure citizen onboarding for a verified Clerk identity that has no existing
   * SCIP account. Creates exactly one new citizen profile, links the Clerk
   * subject, and never escalates role. Returns the created SCIP user.
   */
  onboardClerkCitizen: (params: { name: string; email: string; phone?: string; residenceAddress?: string }) => Promise<User>;
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

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const clerk = (window as any).__scip_clerk__;
  if (clerk && typeof clerk.session?.getToken === 'function') {
    try {
      return await clerk.session.getToken();
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchScipUser(): Promise<User | null> {
  const token = await getClerkToken();
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

let pendingSignIn: any = null;
let pendingSignUp: any = null;

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

  const login = async (email: string, password: string) => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    const signIn = clerk.client?.signIn;
    if (!signIn) throw new Error('Clerk sign-in unavailable');
    const attempt = await signIn.create({ identifier: email, password, strategy: 'password' });
    if (attempt.status !== 'complete') {
      throw new Error(`Sign-in requires additional verification (${attempt.status}).`);
    }
    if (attempt.createdSessionId) {
      await clerk.setActive({ session: attempt.createdSessionId });
    }
    const scipUser = await fetchScipUser();
    setUser(scipUser);
  };

  const sendLoginEmailCode = async (email: string) => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    const signIn = clerk.client?.signIn;
    if (!signIn) throw new Error('Clerk sign-in unavailable');
    pendingSignIn = await signIn.create({ identifier: email });
    await pendingSignIn.prepareFirstFactor({ strategy: 'email_code' });
  };

  const verifyLoginEmailCode = async (code: string) => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    if (!pendingSignIn) throw new Error('No pending email-code sign-in. Request a new code.');
    const attempt = await pendingSignIn.attemptFirstFactor({ strategy: 'email_code', code });
    if (attempt.status !== 'complete') {
      throw new Error(`Sign-in requires additional verification (${attempt.status}).`);
    }
    if (attempt.createdSessionId) {
      await clerk.setActive({ session: attempt.createdSessionId });
    }
    const scipUser = await fetchScipUser();
    setUser(scipUser);
    pendingSignIn = null;
  };

  const register = async (params: { name: string; email: string; phone?: string; password: string }) => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    const signUp = clerk.client?.signUp;
    if (!signUp) throw new Error('Clerk sign-up unavailable');
    const nameParts = params.name.trim().split(/\s+/);
    const firstName = nameParts[0] || params.name.trim();
    const lastName = nameParts.slice(1).join(' ') || undefined;
    const attempt = await signUp.create({
      emailAddress: params.email,
      password: params.password,
      firstName,
      lastName
    });
    if (attempt.status === 'complete' && attempt.createdSessionId) {
      await clerk.setActive({ session: attempt.createdSessionId });
      const scipUser = await fetchScipUser();
      setUser(scipUser);
      pendingSignUp = null;
      return 'complete';
    }
    if (attempt.status === 'missing_requirements') {
      pendingSignUp = attempt;
      const unverified = Array.isArray(attempt.unverifiedFields) ? attempt.unverifiedFields : [];
      if (unverified.includes('email_address') && typeof attempt.prepareEmailAddressVerification === 'function') {
        await attempt.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      return 'verification_required';
    }
    pendingSignUp = attempt;
    return 'verification_required';
  };

  const verifySignupEmailCode = async (code: string) => {
    const clerk = (window as any).__scip_clerk__;
    if (!clerk) throw new Error('Clerk not initialized');
    if (!pendingSignUp) throw new Error('No pending registration. Please submit the registration form again.');
    let attempt = pendingSignUp;
    if (typeof attempt.attemptEmailAddressVerification === 'function') {
      attempt = await attempt.attemptEmailAddressVerification({ code });
    } else {
      throw new Error('Email verification is not available for this registration. Please sign in after completing verification.');
    }
    if (attempt.status === 'complete' && attempt.createdSessionId) {
      await clerk.setActive({ session: attempt.createdSessionId });
      const scipUser = await fetchScipUser();
      setUser(scipUser);
      pendingSignUp = null;
      return;
    }
    if (attempt.status === 'missing_requirements') {
      pendingSignUp = attempt;
      throw new Error('Additional verification is still required by the authentication provider. Please complete the remaining steps, then sign in.');
    }
    pendingSignUp = attempt;
    throw new Error('Verification submitted. If registration is not complete, please sign in after completing any remaining verification steps.');
  };

  const resendSignupEmailCode = async () => {
    if (!pendingSignUp) throw new Error('No pending registration to resend a code for.');
    if (typeof pendingSignUp.prepareEmailAddressVerification !== 'function') {
      throw new Error('Email verification code cannot be resent for this registration.');
    }
    pendingSignUp = await pendingSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
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

  /**
   * Secure citizen onboarding for a verified Clerk identity that has no existing
   * SCIP account. Creates exactly one new citizen profile, links the Clerk
   * subject, and never escalates role. Returns the created SCIP user.
   */
  const onboardClerkCitizen = async (params: { name: string; email: string; phone?: string; residenceAddress?: string }): Promise<User> => {
    const res = await api.onboardClerkCitizen(params);
    const created = (res as any).data;
    if (!created) throw new Error(res?.message || 'Failed to create your SCIP account.');
    // Prefer canonical server state after onboarding (respects role/status/approval rules).
    const canonical = await fetchScipUser();
    if (canonical) {
      setUser(canonical);
      api.setStoredUser(canonical);
      return canonical;
    }
    const scipUser: User = {
      id: created.id,
      name: created.name,
      email: created.email,
      role: (created.role as UserRole) || 'citizen',
      status: (created.status as any) || 'active',
      emailVerified: true,
      phoneVerified: Boolean(params.phone && params.phone.trim().length > 0),
      verificationAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUser(scipUser);
    api.setStoredUser(scipUser);
    return scipUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'citizen',
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        sendLoginEmailCode,
        verifyLoginEmailCode,
        register,
        verifySignupEmailCode,
        resendSignupEmailCode,
        logout,
        hasPermission,
        emailVerified,
        phoneVerified,
        sendSmsVerification,
        verifySms,
        resendVerification,
        onboardClerkCitizen
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
