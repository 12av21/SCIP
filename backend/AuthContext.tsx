import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface User {
  email: string;
  full_name: string;
  role: 'citizen' | 'admin' | 'super_admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('scip_access_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Setup default header for subsequent requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // In a real app, you'd call a /me or /validate endpoint
        // For now, we'll decode the JWT or use stored user data
        const storedUser = localStorage.getItem('scip_user_profile');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Session validation failed", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [token]);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('scip_access_token', accessToken);
    localStorage.setItem('scip_refresh_token', refreshToken);
    localStorage.setItem('scip_user_profile', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const logout = () => {
    localStorage.removeItem('scip_access_token');
    localStorage.removeItem('scip_refresh_token');
    localStorage.removeItem('scip_user_profile');
    localStorage.removeItem('role'); // Legacy cleanup
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success("Logged out successfully");
    navigate('/login');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;