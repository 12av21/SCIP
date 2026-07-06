import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User, UserRole } from "../models/User";
import { toSafeUser } from "../models/User";

const FILE_PATH = path.join(process.cwd(), "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "scip_dev_secret_change_me";
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;

async function getUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveUsers(users: User[]) {
  await fs.writeFile(FILE_PATH, JSON.stringify(users, null, 2));
}

function generateToken(user: User) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function registerUser(name: string, email: string, password: string, role: string = "citizen") {
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

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser: User = {
    id: Date.now().toString(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: role as UserRole, // Allow role to be specified for admin creation
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  const token = generateToken(newUser);
  return { user: toSafeUser(newUser), token };
}

export async function loginUser(email: string, password: string) {
  if (!email || !password) {
    throw new AuthError("Email and password are required.", 400);
  }

  const users = await getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const token = generateToken(user);
  return { user: toSafeUser(user), token };
}

export async function getUserById(id: string) {
  const users = await getUsers();
  const user = users.find((u) => u.id === id);
  return user ? toSafeUser(user) : null;
}

export async function updateUser(id: string, updates: { name?: string; email?: string }) {
  const users = await getUsers();
  const userIndex = users.findIndex((u) => u.id === id);
  
  if (userIndex === -1) {
    return null;
  }

  const user = users[userIndex];
  
  if (updates.name) {
    user.name = updates.name.trim();
  }
  
  if (updates.email) {
    const normalizedEmail = updates.email.trim().toLowerCase();
    // Check if email is already taken by another user
    if (users.some((u) => u.email === normalizedEmail && u.id !== id)) {
      throw new AuthError("An account with this email already exists.", 409);
    }
    user.email = normalizedEmail;
  }

  users[userIndex] = user;
  await saveUsers(users);

  return toSafeUser(user);
}

export async function getAllUsers() {
  const users = await getUsers();
  return users.map(toSafeUser);
}

export async function updateUserRole(id: string, role: UserRole) {
  const users = await getUsers();
  const userIndex = users.findIndex((u) => u.id === id);
  
  if (userIndex === -1) {
    return null;
  }

  users[userIndex].role = role;
  await saveUsers(users);

  return toSafeUser(users[userIndex]);
}

export async function deleteUser(id: string, currentUserId: string, currentUserRole: UserRole) {
  const users = await getUsers();
  const userIndex = users.findIndex((u) => u.id === id);
  
  if (userIndex === -1) {
    throw new AuthError("User not found.", 404);
  }

  // Prevent self-deletion
  if (id === currentUserId) {
    throw new AuthError("You cannot delete your own account.", 403);
  }

  // Only super_admin can delete admins
  const userToDelete = users[userIndex];
  if (userToDelete.role === 'admin' && currentUserRole !== 'super_admin') {
    throw new AuthError("Only super admins can delete admin accounts.", 403);
  }

  users.splice(userIndex, 1);
  await saveUsers(users);
}

// Ensures a demo admin account always exists so the admin portal is
// testable without a separate seeding step. Safe to call on every boot.
export async function seedAdminIfMissing() {
  const users = await getUsers();
  if (users.some((u) => u.role === "admin")) return;

  const passwordHash = await bcrypt.hash("Admin@123", SALT_ROUNDS);
  const admin: User = {
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

export function verifyToken(token: string): { id: string; email: string; role: UserRole } {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
}
