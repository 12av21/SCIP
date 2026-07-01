import { Router } from "express";

import {
  getComplaints,
} from "../services/fileStorage";

import {
  calculateRiskScores,
} from "../services/riskEngine";

const router = Router();

router.get("/", async (_req, res) => {
  const complaints =
    await getComplaints();

  const risks =
    calculateRiskScores(
      complaints
    );

  res.json(risks);
});

export default router;