"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_service_1 = require("../services/auth.service");
// Attaches the decoded token payload to req.user, or rejects with 401.
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No authentication token provided." });
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = (0, auth_service_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired session. Please log in again." });
    }
}
// Checks if the authenticated user has one of the required roles
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }
        next();
    };
}
