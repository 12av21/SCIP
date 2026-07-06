"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// PATCH /api/complaints/:id/status
router.patch("/:id/status", (req, res) => {
    res.status(200).json({ message: "Status updated" });
});
exports.default = router;
