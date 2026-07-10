"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileStorage_1 = require("../services/fileStorage");
const gemini_1 = require("../config/gemini");
const router = (0, express_1.Router)();
function generateLocalAnalysis(complaints) {
    const total = complaints.length;
    const categories = {};
    const locations = {};
    const pending = complaints.filter((c) => c.status === "Pending").length;
    complaints.forEach((c) => {
        const cat = c.category || "General";
        const loc = c.location || "General Area";
        categories[cat] = (categories[cat] || 0) + 1;
        locations[loc] = (locations[loc] || 0) + 1;
    });
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const sortedLocations = Object.entries(locations).sort((a, b) => b[1] - a[1]);
    const topCategoryStr = sortedCategories.length > 0 ? `${sortedCategories[0][0]} (${sortedCategories[0][1]} cases)` : "None";
    const topLocationStr = sortedLocations.length > 0 ? `${sortedLocations[0][0]} (${sortedLocations[0][1]} cases)` : "None";
    // Build the markdown
    return `### SCIP Local Intelligence Report (AI Offline Fallback)

---

#### 1. Executive Summary
An automated audit of current civic complaints shows **${total} total cases** registered on the network, with **${pending} cases** currently pending resolution. The community reporting cycle remains active, requiring systematic load management across primary infrastructure sectors.

#### 2. Top Issues
The primary source of citizen complaints is **${topCategoryStr}**. 
${sortedCategories.slice(0, 3).map(([cat, count]) => `- **${cat}**: ${count} reports`).join('\n')}

#### 3. High-Risk Areas
Neighborhood reporting clusters indicate elevated service requests in:
- **Primary Node**: ${topLocationStr}
${sortedLocations.slice(1, 3).map(([loc, count]) => `- **Secondary Node**: ${loc} (${count} cases)`).join('\n')}

#### 4. Recommended Actions
- **Triage**: High-priority ticketing in **${sortedCategories[0]?.[0] || 'infrastructure'}** must be addressed first.
- **Dispatch**: Coordinate with local sanitation and utility departments in **${sortedLocations[0]?.[0] || 'the primary ward'}** to resolve pending cases.
- **Audit**: Conduct a survey on repeated complaints to prevent system bottlenecks.

#### 5. Resource Allocation Advice
- Relocate **25%** of idle service engineering crews to **${sortedLocations[0]?.[0] || 'core sector'}** to address infrastructure volume.
- Monitor response times within the **${sortedCategories[0]?.[0] || 'highest-reported'}** sector to maintain civic service Level Agreements (SLAs).
`;
}
router.get("/", async (_req, res) => {
    const complaints = await (0, fileStorage_1.getComplaints)();
    try {
        const prompt = `
You are a Smart Community Intelligence Analyst.

Analyze these complaints and provide:

1. Executive Summary
2. Top Issues
3. High-Risk Areas
4. Recommended Actions
5. Resource Allocation Advice

Complaint Data:
${JSON.stringify(complaints, null, 2)}
`;
        const response = await gemini_1.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        res.json({
            analysis: response.text,
        });
    }
    catch (error) {
        console.error("Gemini analysis error, falling back to local aggregate summary:", error);
        res.json({
            analysis: generateLocalAnalysis(complaints),
            fallback: true
        });
    }
});
exports.default = router;
