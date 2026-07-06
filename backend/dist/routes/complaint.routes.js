"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const priorityEngine_1 = require("../services/priorityEngine");
const fileStorage_1 = require("../services/fileStorage");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const complaints = await (0, fileStorage_1.getComplaints)();
    const enriched = complaints.map((item) => ({
        ...item,
        priority: (0, priorityEngine_1.calculatePriority)(item),
    }));
    res.json(enriched);
});
router.post("/", async (req, res) => {
    try {
        const complaint = {
            id: Date.now().toString(),
            ...req.body,
            status: "Pending",
            createdAt: new Date().toISOString(),
        };
        await (0, fileStorage_1.saveComplaint)(complaint);
        res.status(201).json(complaint);
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to save complaint",
        });
    }
});
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const complaint = await (0, fileStorage_1.updateComplaintStatus)(id, status);
        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found",
            });
        }
        res.json(complaint);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Status update failed",
        });
    }
});
exports.default = router;
