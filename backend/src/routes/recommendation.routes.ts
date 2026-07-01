import { Router } from "express";

import {
  getComplaints,
} from "../services/fileStorage";

import {
  calculateRiskScores,
} from "../services/riskEngine";

import {
  generateRecommendations,
} from "../services/recommendationEngine";

const router = Router();

router.get("/", async (_req, res) => {
  const complaints =
    await getComplaints();

  const risks =
    calculateRiskScores(
      complaints
    );

  const recommendations =
    generateRecommendations(
      risks
    );

  res.json({
    risks,
    recommendations,
  });
});

export default router;