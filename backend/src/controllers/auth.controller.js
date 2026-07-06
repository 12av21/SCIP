"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const auth_service_1 = require("../services/auth.service");
async function register(req, res) {
    try {
        const { name, email, password } = req.body;
        const result = await (0, auth_service_1.registerUser)(name, email, password);
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
