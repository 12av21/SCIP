import type { Request, Response } from "express";
import { registerUser, loginUser, getUserById, AuthError } from "../services/auth.service";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    const result = await registerUser(name, email, password);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Registration failed." });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Login failed." });
  }
}

export async function me(req: Request, res: Response) {
  try {
    // req.user is attached by auth.middleware
    const authedUser = (req as any).user;
    const user = await getUserById(authedUser.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load user." });
  }
}
