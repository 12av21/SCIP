"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const complaint_routes_1 = __importDefault(require("./routes/complaint.routes"));
const risk_routes_1 = __importDefault(require("./routes/risk.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const recommendation_routes_1 = __importDefault(require("./routes/recommendation.routes"));
const communityAnalysis_routes_1 = __importDefault(require("./routes/communityAnalysis.routes"));
const geminiAnalysis_routes_1 = __importDefault(require("./routes/geminiAnalysis.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const auth_service_1 = require("./services/auth.service");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
// These must come before any route mounts, or routes registered
// earlier miss out on CORS headers and parsed JSON bodies.
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", auth_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/gemini-analysis", geminiAnalysis_routes_1.default);
app.use("/api/community-analysis", communityAnalysis_routes_1.default);
app.use("/api/recommendations", recommendation_routes_1.default);
app.use("/api/ai", ai_routes_1.default);
app.use("/api/complaints", complaint_routes_1.default);
app.use("/api/risk", risk_routes_1.default);
app.get("/", (_req, res) => {
    res.send("SCIP Backend Running");
});
// Must be the last app.use() call — catches anything unhandled above.
app.use(error_middleware_1.errorHandler);
const PORT = process.env.PORT || 5000;
(0, auth_service_1.seedAdminIfMissing)().finally(() => {
    app.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
});
