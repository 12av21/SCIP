"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
// Use after requireAuth. e.g. router.get("/admin-only", requireAuth, requireRole("admin"), handler)
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }
        next();
    };
}
