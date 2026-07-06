"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.updateUserRole = updateUserRole;
exports.deleteUser = deleteUser;
const auth_service_1 = require("../services/auth.service");
async function getAllUsers(req, res) {
    try {
        const users = await (0, auth_service_1.getAllUsers)();
        res.json(users);
    }
    catch (error) {
        if (error instanceof auth_service_1.AuthError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: "Failed to fetch users." });
    }
}
async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const updatedUser = await (0, auth_service_1.updateUserRole)(id, role);
        if (!updatedUser)
            return res.status(404).json({ message: "User not found." });
        res.json(updatedUser);
    }
    catch (error) {
        if (error instanceof auth_service_1.AuthError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: "Failed to update user role." });
    }
}
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const authedUser = req.user;
        await (0, auth_service_1.deleteUser)(id, authedUser.id, authedUser.role);
        res.json({ message: "User deleted successfully." });
    }
    catch (error) {
        if (error instanceof auth_service_1.AuthError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: "Failed to delete user." });
    }
}
