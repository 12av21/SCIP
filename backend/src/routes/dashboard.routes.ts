import { Router } from "express";
import { getComplaints } from "../services/fileStorage";

const router = Router();

router.get("/", async (_req, res) => {
  const complaints = await getComplaints();

  const total = complaints.length;

  const pending = complaints.filter(
    (c: any) => c.status === "Pending"
  ).length;

  const resolved = complaints.filter(
    (c: any) => c.status === "Resolved"
  ).length;

  const inProgress = complaints.filter(
    (c: any) => c.status === "In Progress"
  ).length;

  const areas = new Set(
    complaints.map((c: any) => c.location)
  ).size;

  const recent = complaints
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
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

export default router;