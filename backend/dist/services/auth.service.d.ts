import type { UserRole } from "../models/User";
export declare class AuthError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
export declare function registerUser(name: string, email: string, password: string, role?: string): Promise<{
    user: import("../models/User").SafeUser;
    token: string;
}>;
export declare function loginUser(email: string, password: string): Promise<{
    user: import("../models/User").SafeUser;
    token: string;
}>;
export declare function getUserById(id: string): Promise<import("../models/User").SafeUser | null>;
export declare function updateUser(id: string, updates: {
    name?: string;
    email?: string;
}): Promise<import("../models/User").SafeUser | null>;
export declare function getAllUsers(): Promise<import("../models/User").SafeUser[]>;
export declare function updateUserRole(id: string, role: UserRole): Promise<import("../models/User").SafeUser | null>;
export declare function deleteUser(id: string, currentUserId: string, currentUserRole: UserRole): Promise<void>;
export declare function seedAdminIfMissing(): Promise<void>;
export declare function verifyToken(token: string): {
    id: string;
    email: string;
    role: UserRole;
};
