"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = void 0;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getUserById = getUserById;
exports.seedAdminIfMissing = seedAdminIfMissing;
exports.verifyToken = verifyToken;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const FILE_PATH = path_1.default.join(process.cwd(), "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "scip_dev_secret_change_me";
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;
async function getUsers() {
    try {
        const data = await promises_1.default.readFile(FILE_PATH, "utf-8");
        return JSON.parse(data);
    }
    catch {
        return [];
    }
}
async function saveUsers(users) {
    await promises_1.default.writeFile(FILE_PATH, JSON.stringify(users, null, 2));
}
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}
class AuthError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
exports.AuthError = AuthError;
async function registerUser(name, email, password) {
    if (!name || !email || !password) {
        throw new AuthError("Name, email, and password are all required.", 400);
    }
    if (password.length < 6) {
        throw new AuthError("Password must be at least 6 characters.", 400);
    }
    const users = await getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some((u) => u.email === normalizedEmail)) {
        throw new AuthError("An account with this email already exists.", 409);
    }
    const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    const newUser = {
        id: Date.now().toString(),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "citizen", // self-registration is always a citizen account
        createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await saveUsers(users);
    const token = generateToken(newUser);
    return { user: (0, User_1.toSafeUser)(newUser), token };
}
async function loginUser(email, password) {
    if (!email || !password) {
        throw new AuthError("Email and password are required.", 400);
    }
    const users = await getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user) {
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
    const users = await getUsers();
    const user = users.find((u) => u.id === id);
    return user ? (0, User_1.toSafeUser)(user) : null;
}
// Ensures a demo admin account always exists so the admin portal is
// testable without a separate seeding step. Safe to call on every boot.
async function seedAdminIfMissing() {
    const users = await getUsers();
    if (users.some((u) => u.role === "admin"))
        return;
    const passwordHash = await bcrypt_1.default.hash("Admin@123", SALT_ROUNDS);
    const admin = {
        id: "admin-seed-1",
        name: "Super User",
        email: "admin@scip.gov",
        passwordHash,
        role: "admin",
        createdAt: new Date().toISOString(),
    };
    users.push(admin);
    await saveUsers(users);
    console.log("Seeded default admin account: admin@scip.gov / Admin@123");
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
