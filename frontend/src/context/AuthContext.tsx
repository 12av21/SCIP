import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export type UserRole = "citizen" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("scip_access_token"));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const storedUser = localStorage.getItem("scip_user_profile");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // corrupted local storage entry, ignore
        }
      }
    }
    setLoading(false);
  }, [token]);

  const persistSession = (newToken: string, userData: User) => {
    localStorage.setItem("scip_access_token", newToken);
    localStorage.setItem("scip_user_profile", JSON.stringify(userData));
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
  };

  const login = async (email: string, password: string): Promise<User> => {
    const res = await axios.post("/api/auth/login", { email, password });
    const { user: userData, token: newToken } = res.data;
    persistSession(newToken, userData);
    return userData;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const res = await axios.post("/api/auth/register", { name, email, password });
    const { user: userData, token: newToken } = res.data;
    persistSession(newToken, userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("scip_access_token");
    localStorage.removeItem("scip_user_profile");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === "admin",
    loading,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
