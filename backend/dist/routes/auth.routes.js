"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware"); // Assuming you have an auth.middleware.ts
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.get("/me", auth_middleware_1.requireAuth, auth_controller_1.me);
router.patch("/profile", auth_middleware_1.requireAuth, auth_controller_1.updateProfile);
router.post("/send-verification-email", auth_middleware_1.requireAuth, auth_controller_1.sendVerificationEmail);
router.post("/verify-email", auth_controller_1.verifyEmail);
router.post("/forgot-password", auth_controller_1.forgotPassword);
router.post("/reset-password", auth_controller_1.resetPassword);
exports.default = router;
