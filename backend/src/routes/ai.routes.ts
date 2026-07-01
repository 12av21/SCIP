import { Router } from "express";
import { ai } from "../config/gemini";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    res.json({
      reply: response.text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI Error",
    });
  }
});

export default router;