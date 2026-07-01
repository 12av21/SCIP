import { Router } from "express";
import { calculatePriority } from "../services/priorityEngine";
import {
  getComplaints,
  saveComplaint,
  updateComplaintStatus,
} from "../services/fileStorage"; 

const router = Router();

router.get("/", async (_req, res) => {
  const complaints =
    await getComplaints();

  const enriched =
    complaints.map((item: any) => ({
      ...item,
      priority:
        calculatePriority(item),
    }));

  res.json(enriched);
});
router.post("/", async (req, res) => {
  try {
    const complaint = {
      id: Date.now().toString(),
      ...req.body,
      status: "Pending",
      createdAt:
        new Date().toISOString(),
    };

    await saveComplaint(complaint);

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({
      error:
        "Failed to save complaint",
    });
  }
});
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const complaint =
      await updateComplaintStatus(
        id,
        status
      );

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.json(complaint);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Status update failed",
    });
  }
});
export default router;