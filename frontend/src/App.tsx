import { BrowserRouter, Routes, Route } from "react-router-dom";
import GeminiAnalysis from "./pages/GeminiAnalysis";
import Dashboard from "./pages/Dashboard";
import SubmitComplaint from "./pages/SubmitComplaint";
import Complaints from "./pages/Complaints";
import Analytics from "./pages/Analytics";
import CommunityRisk from "./pages/CommunityRisk";
import AIChat from "./pages/AIChat";
import Recommendations from "./pages/Recommendations";
import AreaRanking from "./pages/AreaRanking";
import CommunityAnalysis from "./pages/CommunityAnalysis";
import ExecutiveReport from "./pages/ExecutiveReport";





function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route
  path="/report"
  element={<ExecutiveReport />}
/>
<Route
  path="/gemini-analysis"
  element={<GeminiAnalysis />}
/>
    <Route
  path="/community-analysis"
  element={<CommunityAnalysis />}
/>
    <Route
  path="/ranking"
  element={<AreaRanking />}
/>
      
        <Route
  path="/recommendations"
  element={<Recommendations />}
/>
        <Route path="/" element={<Dashboard />} />
        <Route path="/submit" element={<SubmitComplaint />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/risk" element={<CommunityRisk />} />
        <Route path="/assistant" element={<AIChat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;