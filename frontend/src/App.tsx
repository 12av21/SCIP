import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import CitizenLayout from "./components/CitizenLayout";
import GeminiAnalysis from "./pages/GeminiAnalysis";
import Dashboard from "./pages/Dashboard";
import SubmitComplaint from "./pages/SubmitComplaint";
import Complaints from "./pages/Complaints";
import Analytics from "./pages/Analytics";
import CommunityRisk from "./pages/CommunityRisk";
import CitizenDashboard from "./pages/CitizenDashboard";
import CitizenNotifications from "./pages/CitizenNotifications";
import CitizenComplaintDetails from "./pages/CitizenComplaintDetails";
import AIChat from "./pages/AIChat";
import Recommendations from "./pages/Recommendations";
import AreaRanking from "./pages/AreaRanking";
import CommunityAnalysis from "./pages/CommunityAnalysis";
import ExecutiveReport from "./pages/ExecutiveReport";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResourceAllocation from "./pages/ResourceAllocation";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen Portal Routes */}
          <Route
            path="/citizen/*"
            element={
              <ProtectedRoute allowedRole="citizen">
                <CitizenLayout>
                  <Routes>
                    <Route path="/" element={<CitizenDashboard />} />
                    <Route path="/submit" element={<SubmitComplaint />} />
                    <Route path="/history" element={<Complaints />} />
                    <Route path="/complaint/:id" element={<CitizenComplaintDetails />} />
                    <Route path="/notifications" element={<CitizenNotifications />} />
                    <Route path="/assistant" element={<AIChat />} />
                  </Routes>
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Portal Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRole="admin">
                <Layout>
                  <Routes>
                    <Route path="/report" element={<ExecutiveReport />} />
                    <Route path="/gemini-analysis" element={<GeminiAnalysis />} />
                    <Route path="/community-analysis" element={<CommunityAnalysis />} />
                    <Route path="/ranking" element={<AreaRanking />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/submit" element={<SubmitComplaint />} />
                    <Route path="/resources" element={<ResourceAllocation />} />
                    <Route path="/complaints" element={<Complaints />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/risk" element={<CommunityRisk />} />
                    <Route path="/assistant" element={<AIChat />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
