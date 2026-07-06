import type { Request, Response } from "express";
import { registerUser, loginUser, getUserById, updateUser, AuthError } from "../services/auth.service";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body;
    const result = await registerUser(name, email, password, role);
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

export async function updateProfile(req: Request, res: Response) {
  try {
    const authedUser = (req as any).user;
    const { name, email } = req.body;
    const updatedUser = await updateUser(authedUser.id, { name, email });
    if (!updatedUser) return res.status(404).json({ message: "User not found." });
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update profile." });
  }
}

export async function sendVerificationEmail(req: Request, res: Response) {
  try {
    // In a real implementation, this would send an email with a verification token
    // For now, we'll just return success
    res.json({ message: "Verification email sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send verification email." });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.body;
    // In a real implementation, this would verify the token and mark user as verified
    // For now, we'll just return success
    res.json({ message: "Email verified successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to verify email." });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    // In a real implementation, this would send a password reset email
    // For now, we'll just return success
    res.json({ message: "If an account with that email exists, a password reset link has been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send password reset email." });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    // In a real implementation, this would verify the token and update the password
    // For now, we'll just return success
    res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reset password." });
  }
}
