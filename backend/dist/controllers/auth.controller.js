"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
exports.updateProfile = updateProfile;
exports.sendVerificationEmail = sendVerificationEmail;
exports.verifyEmail = verifyEmail;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const auth_service_1 = require("../services/auth.service");
async function register(req, res) {
    try {
        const { name, email, password, role } = req.body;
        const result = await (0, auth_service_1.registerUser)(name, email, password, role);
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof auth_service_1.AuthError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: "Registration failed." });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        res.json(result);
    }
    catch (error) {
        if (error instanceof auth_service_1.AuthError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: "Login failed." });
    }
}
async function me(req, res) {
    try {
        // req.user is attached by auth.middleware
        const authedUser = req.user;
        const user = await (0, auth_service_1.getUserById)(authedUser.id);
        if (!user)
            return res.status(404).json({ message: "User not found." });
        res.json({ user });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load user." });
    }
}
async function updateProfile(req, res) {
    try {
        const authedUser = req.user;
        const { name, email } = req.body;
        const updatedUser = await (0, auth_service_1.updateUser)(authedUser.id, { name, email });
        if (!updatedUser)
            return res.status(404).json({ message: "User not found." });
        res.json(updatedUser);
    }
    catch (error) {
        if (error instanceof auth_service_1.AuthError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: "Failed to update profile." });
    }
}
async function sendVerificationEmail(req, res) {
    try {
        // In a real implementation, this would send an email with a verification token
        // For now, we'll just return success
        res.json({ message: "Verification email sent." });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to send verification email." });
    }
}
async function verifyEmail(req, res) {
    try {
        const { token } = req.body;
        // In a real implementation, this would verify the token and mark user as verified
        // For now, we'll just return success
        res.json({ message: "Email verified successfully." });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to verify email." });
    }
}
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        // In a real implementation, this would send a password reset email
        // For now, we'll just return success
        res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to send password reset email." });
    }
}
async function resetPassword(req, res) {
    try {
        const { token, password } = req.body;
        // In a real implementation, this would verify the token and update the password
        // For now, we'll just return success
        res.json({ message: "Password reset successfully." });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to reset password." });
    }
}
