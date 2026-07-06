import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  allowedRoles?: ('citizen' | 'admin' | 'super_admin')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Determine redirection path and message
  let redirectPath: string | null = null;
  let toastMessage: string | null = null;

  console.log("ProtectedRoute state:", { isAuthenticated, user, loading, allowedRoles });
  if (user) {
    console.log("User role:", user.role);
  }
  // Always call useEffect first, even if logic inside is conditional
  // This ensures the order of hooks remains consistent across renders.
  useEffect(() => {
    if (toastMessage) {
      toast.error(toastMessage);
    }
  }, [toastMessage]);

  // While authentication status is being determined, show nothing or a loading spinner
  if (loading) {
    return <div>Loading authentication status...</div>; // Show a loading message or spinner
  }

  if (!isAuthenticated) { // If not authenticated, redirect to the login page
    redirectPath = "/login";
    toastMessage = "You need to log in to access this page.";
  } else if (allowedRoles && user && !allowedRoles.includes(user.role)) { // If roles are specified, check if the user has one of the allowed roles
    toastMessage = "You do not have permission to view this page.";
    if (user.role === 'admin' || user.role === 'super_admin') {
      redirectPath = "/admin";
    } else {
      redirectPath = "/citizen";
    }
  }
  // Perform redirection if needed
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  // If authenticated and has the required role (or no roles are specified), render the child routes
  return <Outlet />;
}