import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";

// Attaches the decoded token payload to req.user, or rejects with 401.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No authentication token provided." });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session. Please log in again." });
  }
}

// Checks if the authenticated user has one of the required roles
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    
    next();
  };
}
