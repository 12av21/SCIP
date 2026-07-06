"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileStorage_1 = require("../services/fileStorage");
const riskEngine_1 = require("../services/riskEngine");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const complaints = await (0, fileStorage_1.getComplaints)();
    const risks = (0, riskEngine_1.calculateRiskScores)(complaints);
    res.json(risks);
});
exports.default = router;
