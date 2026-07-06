import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import complaintRoutes from "./routes/complaint.routes";
import riskRoutes from "./routes/risk.routes";
import aiRoutes from "./routes/ai.routes";
import recommendationRoutes from "./routes/recommendation.routes";
import communityAnalysisRoutes from "./routes/communityAnalysis.routes";
import geminiAnalysisRoutes from "./routes/geminiAnalysis.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import userRoutes from "./routes/user.routes";
import userSettingsRoutes from "./routes/userSettings.routes";
import { seedAdminIfMissing } from "./services/auth.service";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// These must come before any route mounts, or routes registered
// earlier miss out on CORS headers and parsed JSON bodies.
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/gemini-analysis", geminiAnalysisRoutes);
app.use("/api/community-analysis", communityAnalysisRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/user/settings", userSettingsRoutes);

app.get("/", (_req, res) => {
  res.send("SCIP Backend Running");
});

// Must be the last app.use() call — catches anything unhandled above.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

seedAdminIfMissing().finally(() => {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
