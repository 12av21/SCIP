import { Router } from "express";
import { getComplaints } from "../services/fileStorage";
import { ai } from "../config/gemini";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const complaints = await getComplaints();

    const prompt = `
You are a Smart Community Intelligence Analyst.

Analyze these complaints and provide:

1. Executive Summary
2. Top Issues
3. High-Risk Areas
4. Recommended Actions
5. Resource Allocation Advice

Complaint Data:
${JSON.stringify(complaints, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      analysis: response.text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Analysis failed",
    });
  }
});

export default router;
