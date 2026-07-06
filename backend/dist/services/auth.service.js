"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = void 0;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.getAllUsers = getAllUsers;
exports.updateUserRole = updateUserRole;
exports.deleteUser = deleteUser;
exports.seedAdminIfMissing = seedAdminIfMissing;
exports.verifyToken = verifyToken;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importStar(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET || "scip_dev_secret_change_me";
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;
class AuthError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
exports.AuthError = AuthError;
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}
async function registerUser(name, email, password, role = "citizen") {
    if (!name || !email || !password) {
        throw new AuthError("Name, email, and password are all required.", 400);
    }
    if (password.length < 6) {
        throw new AuthError("Password must be at least 6 characters.", 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User_1.default.findOne({ email: normalizedEmail });
    if (existingUser) {
        throw new AuthError("An account with this email already exists.", 409);
    }
    const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    const newUser = await User_1.default.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role,
        isVerified: false,
    });
    const token = generateToken(newUser);
    return { user: (0, User_1.toSafeUser)(newUser), token };
}
async function loginUser(email, password) {
    if (!email || !password) {
        throw new AuthError("Email and password are required.", 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User_1.default.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
        throw new AuthError("Invalid email or password.", 401);
    }
    const matches = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!matches) {
        throw new AuthError("Invalid email or password.", 401);
    }
    const token = generateToken(user);
    return { user: (0, User_1.toSafeUser)(user), token };
}
async function getUserById(id) {
    const user = await User_1.default.findById(id);
    return user ? (0, User_1.toSafeUser)(user) : null;
}
async function updateUser(id, updates) {
    const user = await User_1.default.findById(id);
    if (!user)
        return null;
    if (updates.email) {
        const normalizedEmail = updates.email.trim().toLowerCase();
        const existingUserWithNewEmail = await User_1.default.findOne({ email: normalizedEmail, _id: { $ne: id } }); // Check for uniqueness excluding current user
        if (existingUserWithNewEmail) { // Added missing if condition
            throw new AuthError("An account with this email already exists.", 409);
        }
        user.email = normalizedEmail;
    }
    // Apply other updates
    Object.assign(user, updates);
    await user.save();
    return (0, User_1.toSafeUser)(user);
}
async function getAllUsers() {
    const users = await User_1.default.find({});
    return users.map(User_1.toSafeUser);
}
async function updateUserRole(id, role) {
    const user = await User_1.default.findById(id);
    if (!user)
        return null;
    user.role = role;
    await user.save();
    return (0, User_1.toSafeUser)(user);
}
async function deleteUser(id, currentUserId, currentUserRole) {
    const userToDelete = await User_1.default.findById(id);
    if (!userToDelete) {
        throw new AuthError("User not found.", 404);
    }
    if (id === currentUserId) {
        throw new AuthError("You cannot delete your own account.", 403);
    }
    if (userToDelete.role === 'admin' && currentUserRole !== 'super_admin') {
        throw new AuthError("Only super admins can delete admin accounts.", 403);
    }
    await User_1.default.findByIdAndDelete(id);
}
// Ensures a demo admin account always exists so the admin portal is
// testable without a separate seeding step. Safe to call on every boot.
async function seedAdminIfMissing() {
    const adminExists = await User_1.default.findOne({ role: "admin" });
    if (adminExists)
        return;
    const passwordHash = await bcrypt_1.default.hash("Admin@123", SALT_ROUNDS);
    await User_1.default.create({
        name: "Super User",
        email: "admin@scip.gov",
        passwordHash,
        role: "admin",
        isVerified: true,
    });
    console.log("Seeded default admin account: admin@scip.gov / Admin@123");
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
