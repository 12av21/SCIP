import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import EmailVerification from './pages/EmailVerification';
import Profile from './pages/Profile'; // Import the new Profile page
import Settings from './pages/Settings'; // Import the new Settings page
import UserManagement from './pages/UserManagement'; // Import the new UserManagement page
import ResetPassword from './pages/ResetPassword';

// Citizen Pages
import CitizenLayout from './components/CitizenLayout';
import CitizenDashboard from './pages/CitizenDashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import CitizenComplaintDetails from './pages/CitizenComplaintDetails';
import CitizenNotifications from './pages/CitizenNotifications';

// Admin Pages
import Layout from './components/Layout'; // Assuming this is the admin layout
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import Analytics from './pages/Analytics';
import CommunityRisk from './pages/CommunityRisk';
import ExecutiveReport from './pages/ExecutiveReport';
import AIChat from './pages/AIChat';
import Recommendations from './pages/Recommendations';
import GeminiAnalysis from './pages/GeminiAnalysis';
import AreaRanking from './pages/AreaRanking';
import CommunityAnalysis from './pages/CommunityAnalysis';
import ResourceAllocation from './pages/ResourceAllocation';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen Protected Routes */}
          <Route path="/citizen" element={<ProtectedRoute allowedRoles={['citizen']} />}>
            <Route element={<CitizenLayout />}>
              <Route index element={<CitizenDashboard />} />
              <Route path="submit" element={<SubmitComplaint />} />
              <Route path="history" element={<Complaints />} /> {/* Reusing Complaints for citizen history */}
              <Route path="complaint/:id" element={<CitizenComplaintDetails />} />
              <Route path="notifications" element={<CitizenNotifications />} />
              <Route path="settings" element={<Settings />} /> {/* Add settings route for citizens */}
              <Route path="profile" element={<Profile />} /> {/* Add profile route for citizens */}
            </Route>
          </Route>

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="complaints" element={<Complaints />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="risk" element={<CommunityRisk />} />
              <Route path="ranking" element={<AreaRanking />} />
              <Route path="community-analysis" element={<CommunityAnalysis />} />
              <Route path="report" element={<ExecutiveReport />} />
              <Route path="assistant" element={<AIChat />} />
              <Route path="gemini-analysis" element={<GeminiAnalysis />} />
              <Route path="recommendations" element={<Recommendations />} />
              <Route path="resources" element={<ResourceAllocation />} />
              <Route path="settings" element={<Settings />} /> {/* Add settings route for admins */}
              <Route path="users" element={<UserManagement />} /> {/* Add user management route for admins */}
              <Route path="profile" element={<Profile />} /> {/* Add profile route for admins */}
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}