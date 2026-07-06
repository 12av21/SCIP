import { Router } from "express";
import { getAllUsers, updateUserRole, deleteUser } from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

// All user management routes require admin or super_admin role
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin']));

router.get("/", getAllUsers);
router.patch("/:id", updateUserRole);
router.delete("/:id", deleteUser);

export default router;
