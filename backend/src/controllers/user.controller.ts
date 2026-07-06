import type { Request, Response } from "express";
import { getAllUsers as getAllUsersService, updateUserRole as updateUserRoleService, deleteUser as deleteUserService, AuthError } from "../services/auth.service";
import type { UserRole } from "../models/User";

export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await getAllUsersService();
    res.json(users);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
}

export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updatedUser = await updateUserRoleService(id as string, role as UserRole);
    if (!updatedUser) return res.status(404).json({ message: "User not found." });
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update user role." });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const authedUser = (req as any).user;
    await deleteUserService(id as string, authedUser.id, authedUser.role);
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to delete user." });
  }
}
