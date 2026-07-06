import type { Request, Response, NextFunction } from "express";

// Use after requireAuth. e.g. router.get("/admin-only", requireAuth, requireRole("admin"), handler)
export function requireRole(...roles: Array<"citizen" | "admin">) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    next();
  };
}
