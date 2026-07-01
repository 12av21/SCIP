import { Router } from "express";
import { getComplaints } from "../services/fileStorage";

const router = Router();

router.get("/", async (_req, res) => {
  const complaints = await getComplaints();

  const categoryMap: Record<string, number> = {};
  const areaMap: Record<string, number> = {};

  complaints.forEach((c: any) => {
    categoryMap[c.category] =
      (categoryMap[c.category] || 0) + 1;

    areaMap[c.location] =
      (areaMap[c.location] || 0) + 1;
  });

  const topCategory =
    Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])[0];

  const topArea =
    Object.entries(areaMap)
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

export default router;