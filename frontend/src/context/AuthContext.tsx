import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import api from '../utils/api'; // Import the centralized API client

// Define the structure of the user object
interface User {
  id: string;
  name: string;
  email: string;
  isVerified: boolean; // Added for email verification
  role: 'citizen' | 'admin' | 'super_admin';
  // Add any other user-specific properties here
}

// Define the structure of the decoded JWT token
interface DecodedToken {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  role: 'citizen' | 'admin' | 'super_admin';
  exp: number; // Expiration timestamp (Unix time)
}

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  updateProfile: (updates: Partial<Omit<User, 'id' | 'role' | 'isVerified'>>) => Promise<User>;
  sendVerificationEmail: () => Promise<void>; // Added for email verification
  verifyEmail: (token: string) => Promise<void>; // Added for email verification
  register: (name: string, email: string, password: string, role?: 'citizen' | 'admin' | 'super_admin') => Promise<User>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => void;
  // Potentially add functions for email verification, forgot password, reset password
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component to wrap the application and provide authentication context
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Effect to initialize user from stored token on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try { //
          const decodedToken: DecodedToken = jwtDecode(token);
          // Check if token is expired
          if (decodedToken.exp * 1000 < Date.now()) {
            console.log("Token expired, attempting refresh or logging out.");
            // In a real application, you'd attempt to refresh the token here.
            // For now, we'll just clear it.
            logout();
          } else {
            // Validate token with backend to ensure it's still active and get full user data
            // This is a crucial step for production-grade auth to prevent using stale tokens.
            const response = await api.get('/auth/me');
            
            const fetchedUser: User = response.data;
            setUser(fetchedUser);
          }
        } catch (error) {
          console.error("Failed to decode or validate token:", error);
          logout(); // Clear invalid token
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]); // Re-run if token changes (e.g., after login/logout)

  // Login function
  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  // Register function
  const register = async (name: string, email: string, password: string, role: 'citizen' | 'admin' | 'super_admin' = 'citizen'): Promise<User> => {
    const response = await api.post('/auth/register', { name, email, password, role });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  // Update Profile function
  const updateProfile = async (updates: Partial<Omit<User, 'id' | 'role' | 'isVerified'>>): Promise<User> => {
    const response = await api.patch('/auth/profile', updates);
    const updatedUser: User = response.data;
    setUser(updatedUser);
    toast.success("Profile updated successfully!");
    return updatedUser;
  };

  // Send Email Verification function
  const sendVerificationEmail = async (): Promise<void> => {
    await api.post('/auth/send-verification-email');
    toast.success("Verification email sent! Please check your inbox.");
  };

  // Verify Email function
  const verifyEmail = async (token: string): Promise<void> => {
    await api.post('/auth/verify-email', { token });
    // Update user state to reflect verification
    setUser(prevUser => (prevUser ? { ...prevUser, isVerified: true } : null));
    toast.success("Your email has been verified successfully!");
  };

  // Forgot Password function
  const forgotPassword = async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
    toast.success("If an account with that email exists, a password reset link has been sent.");
  };

  // Reset Password function
  const resetPassword = async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
    toast.success("Your password has been reset successfully. Please log in.");
    // After successful password reset, redirect to login page
    // This part would typically be handled by the component calling resetPassword
    // but adding a navigate here for immediate feedback if needed.
    // navigate('/login'); // Assuming navigate is available or passed
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null); //
    toast.success("You have been logged out.");
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    isAdmin,
    isSuperAdmin,
    isAuthenticated,
    loading,
    login,
    updateProfile, // Added to context value
    sendVerificationEmail, // Added to context value
    verifyEmail, // Added to context value
    forgotPassword,
    resetPassword,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}