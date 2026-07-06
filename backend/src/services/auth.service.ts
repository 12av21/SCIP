import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { IUser, UserRole, toSafeUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "scip_dev_secret_change_me";
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function generateToken(user: IUser) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export async function registerUser(name: string, email: string, password: string, role: string = "citizen") {
  if (!name || !email || !password) {
    throw new AuthError("Name, email, and password are all required.", 400);
  }
  if (password.length < 6) {
    throw new AuthError("Password must be at least 6 characters.", 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AuthError("An account with this email already exists.", 409);
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: role as UserRole,
    isVerified: false,
  });
  const token = generateToken(newUser);
  return { user: toSafeUser(newUser), token };
}

export async function loginUser(email: string, password: string) {
  if (!email || !password) {
    throw new AuthError("Email and password are required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.passwordHash) {
    throw new AuthError("Invalid email or password.", 401);
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const token = generateToken(user);
  return { user: toSafeUser(user), token };
}

export async function getUserById(id: string): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'> | null> {
  const user = await User.findById(id);
  return user ? toSafeUser(user) : null;
}

export async function updateUser(id: string, updates: Partial<Omit<IUser, 'id' | 'role' | 'createdAt' | 'passwordHash'>>): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'> | null> {
  const user = await User.findById(id);
  if (!user) return null;
  if (updates.email) {
    const normalizedEmail = updates.email.trim().toLowerCase();
    const existingUserWithNewEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: id } }); // Check for uniqueness excluding current user
    if (existingUserWithNewEmail) { // Added missing if condition
      throw new AuthError("An account with this email already exists.", 409);
    }
    user.email = normalizedEmail;
  }
  // Apply other updates
  Object.assign(user, updates);
  await user.save();

  return toSafeUser(user);
}

export async function getAllUsers(): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'>[]> {
  const users = await User.find({});
  return users.map(toSafeUser);
}

export async function updateUserRole(id: string, role: UserRole): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'> | null> {
  const user = await User.findById(id);
  if (!user) return null;
  user.role = role;
  await user.save();
  return toSafeUser(user);
}

export async function deleteUser(id: string, currentUserId: string, currentUserRole: UserRole) {
  const userToDelete = await User.findById(id);
  if (!userToDelete) {
    throw new AuthError("User not found.", 404);
  }
  if (id === currentUserId) {
    throw new AuthError("You cannot delete your own account.", 403);
  }
  if (userToDelete.role === 'admin' && currentUserRole !== 'super_admin') {
    throw new AuthError("Only super admins can delete admin accounts.", 403);
  }
  await User.findByIdAndDelete(id);
}

// Ensures a demo admin account always exists so the admin portal is
// testable without a separate seeding step. Safe to call on every boot.
export async function seedAdminIfMissing() {
  const adminExists = await User.findOne({ role: "admin" });
  if (adminExists) return;

  const passwordHash = await bcrypt.hash("Admin@123", SALT_ROUNDS);
  await User.create({
    name: "Super User",
    email: "admin@scip.gov",
    passwordHash,
    role: "admin",
    isVerified: true,
  });
  console.log("Seeded default admin account: admin@scip.gov / Admin@123");
}

export function verifyToken(token: string): { id: string; email: string; role: UserRole } {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
}
