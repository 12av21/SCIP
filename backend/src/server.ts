import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import complaintRoutes from "./routes/complaint.routes";
import riskRoutes from "./routes/risk.routes";
//import aiRoutes from "./routes/ai.routes";
import recommendationRoutes from "./routes/recommendation.routes";

import communityAnalysisRoutes from "./routes/communityAnalysis.routes";
import geminiAnalysisRoutes from "./routes/geminiAnalysis.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use("/api/dashboard", dashboardRoutes);
app.use(
  "/api/gemini-analysis",
  geminiAnalysisRoutes
);
app.use(
  "/api/community-analysis",
  communityAnalysisRoutes
);
app.use(cors());
app.use(
  "/api/recommendations",
  recommendationRoutes
);
app.use(
  "/api/community-analysis",
  communityAnalysisRoutes
);
app.use(express.json());
//app.use("/api/ai", aiRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/risk", riskRoutes);
app.get("/", (_req, res) => {
  res.send("SCIP Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});