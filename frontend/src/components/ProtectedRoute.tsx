import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  allowedRoles?: ('citizen' | 'admin' | 'super_admin')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();

  // While authentication status is being determined, show nothing or a loading spinner
  if (loading) {
    return null; // Or a loading spinner component
  }

  // If not authenticated, redirect to the login page
  if (!isAuthenticated) {
    toast.error("You need to log in to access this page.");
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check if the user has one of the allowed roles
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If the user is authenticated but doesn't have the required role,
    // redirect them to a more appropriate page or an unauthorized access page.
    // For now, we'll redirect admins to their dashboard and citizens to theirs.
    if (user.role === 'admin' || user.role === 'super_admin') {
      toast.error("You do not have permission to view this page.");
      return <Navigate to="/admin" replace />;
    } else {
      toast.error("You do not have permission to view this page.");
      return <Navigate to="/citizen" replace />;
    }
  }

  // If authenticated and has the required role (or no roles are specified), render the child routes
  return <Outlet />;
}