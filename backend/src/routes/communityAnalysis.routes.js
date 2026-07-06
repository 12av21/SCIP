"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileStorage_1 = require("../services/fileStorage");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const complaints = await (0, fileStorage_1.getComplaints)();
    const categoryMap = {};
    const areaMap = {};
    complaints.forEach((c) => {
        categoryMap[c.category] =
            (categoryMap[c.category] || 0) + 1;
        areaMap[c.location] =
            (areaMap[c.location] || 0) + 1;
    });
    const topCategory = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])[0];
    const topArea = Object.entries(areaMap)
        .sort((a, b) => b[1] - a[1])[0];
    res.json({
        totalComplaints: complaints.length,
        topCategory,
        topArea,
        insights: [
            `${topCategory?.[0] || "N/A"} is the most reported issue.`,
            `${topArea?.[0] || "N/A"} requires increased attention.`,
            "Increase resources for unresolved complaints.",
        ],
    });
});
exports.default = router;
