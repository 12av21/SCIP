"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileStorage_1 = require("../services/fileStorage");
const gemini_1 = require("../config/gemini");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        const complaints = await (0, fileStorage_1.getComplaints)();
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
        console.error(error);
        res.status(500).json({
            error: "Analysis failed",
        });
    }
});
exports.default = router;
