"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gemini_1 = require("../config/gemini");
const router = (0, express_1.Router)();
const CATEGORIES = ["Water", "Electricity", "Road", "Waste", "Health"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
function heuristicTriage(description) {
    const text = description.toLowerCase();
    let suggestedCategory = "Road";
    if (text.includes("wire") || text.includes("power") || text.includes("electric")) {
        suggestedCategory = "Electricity";
    }
    else if (text.includes("water") || text.includes("leak") || text.includes("pipe")) {
        suggestedCategory = "Water";
    }
    else if (text.includes("garbage") || text.includes("trash") || text.includes("waste")) {
        suggestedCategory = "Waste";
    }
    else if (text.includes("sick") || text.includes("health") || text.includes("hospital")) {
        suggestedCategory = "Health";
    }
    const suggestedPriority = text.includes("urgent") || text.includes("danger") || text.includes("emergency")
        ? "Critical"
        : "Medium";
    return { suggestedCategory, suggestedPriority };
}
// POST /api/ai/chat — conversational assistant for citizens/admins
router.post("/chat", async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "A message is required." });
    }
    try {
        const prompt = `You are the SCIP community assistant, helping citizens with questions about filing complaints, checking complaint status, and understanding community risk data. Be concise and helpful.

Citizen question: ${message}`;
        const response = await gemini_1.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        res.json({ reply: response.text });
    }
    catch (error) {
        console.error("AI chat failed, falling back to a canned response:", error);
        res.json({
            reply: "I'm having trouble reaching the AI service right now. You can still file a complaint from the Submit page, or check your complaint history for status updates.",
        });
    }
});
// POST /api/ai/triage — suggests a category + priority for a complaint description
router.post("/triage", async (req, res) => {
    const { description } = req.body;
    if (!description || typeof description !== "string") {
        return res.status(400).json({ message: "A description is required." });
    }
    try {
        const prompt = `Classify this civic complaint. Respond with ONLY a JSON object like {"category": "...", "priority": "..."} — category must be exactly one of ${CATEGORIES.join(", ")}, priority must be exactly one of ${PRIORITIES.join(", ")}. No other text.

Complaint: ${description}`;
        const response = await gemini_1.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        const cleaned = (response.text || "").replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const suggestedCategory = CATEGORIES.includes(parsed.category) ? parsed.category : "Road";
        const suggestedPriority = PRIORITIES.includes(parsed.priority) ? parsed.priority : "Medium";
        res.json({ suggestedCategory, suggestedPriority });
    }
    catch (error) {
        console.error("AI triage failed, falling back to keyword heuristic:", error);
        res.json(heuristicTriage(description));
    }
});
exports.default = router;
