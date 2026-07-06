import { Router } from "express";

const router = Router();

// PATCH /api/complaints/:id/status
router.patch("/:id/status", (req, res) => {
  res.status(200).json({ message: "Status updated" });
});

export default router;
