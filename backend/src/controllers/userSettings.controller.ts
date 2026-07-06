import type { Request, Response } from "express";
import { getUserSettings, updateUserSettings } from "../services/userSettings.service";

export async function getSettings(req: Request, res: Response) {
  try {
    const authedUser = (req as any).user;
    const settings = await getUserSettings(authedUser.id);
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load settings." });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const authedUser = (req as any).user;
    const updatedSettings = await updateUserSettings(authedUser.id, req.body);
    res.json(updatedSettings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save settings." });
  }
}
