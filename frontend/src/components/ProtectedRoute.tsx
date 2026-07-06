import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "citizen" | "admin";
}

/**
 * A wrapper component to protect routes based on authentication status and user roles.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-brass border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest opacity-50">Authenticating SCIP Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the current location to return after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole === "admin" && !isAdmin) {
    // Admin area requires admin role; bounce citizens back to their own dashboard
    return <Navigate to="/citizen" replace />;
  }

  if (allowedRole === "citizen" && isAdmin) {
    // Admins have no citizen data of their own; send them to their dashboard instead
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
