"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileStorage_1 = require("../services/fileStorage");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const complaints = await (0, fileStorage_1.getComplaints)();
    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === "Pending").length;
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const inProgress = complaints.filter((c) => c.status === "In Progress").length;
    const areas = new Set(complaints.map((c) => c.location)).size;
    const recent = complaints
        .sort((a, b) => new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime())
        .slice(0, 5);
    res.json({
        total,
        pending,
        resolved,
        inProgress,
        areas,
        recent,
    });
});
exports.default = router;
