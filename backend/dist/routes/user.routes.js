"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All user management routes require admin or super_admin role
router.use(auth_middleware_1.requireAuth);
router.use((0, auth_middleware_1.requireRole)(['admin', 'super_admin']));
router.get("/", user_controller_1.getAllUsers);
router.patch("/:id", user_controller_1.updateUserRole);
router.delete("/:id", user_controller_1.deleteUser);
exports.default = router;
