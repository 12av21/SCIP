import { IUser, UserRole } from "../models/User";
export declare class AuthError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
export declare function registerUser(name: string, email: string, password: string, role?: string): Promise<{
    user: Omit<IUser, "__v" | "_id" | "passwordHash" | "passwordResetToken" | "passwordResetExpires">;
    token: string;
}>;
export declare function loginUser(email: string, password: string): Promise<{
    user: Omit<IUser, "__v" | "_id" | "passwordHash" | "passwordResetToken" | "passwordResetExpires">;
    token: string;
}>;
export declare function getUserById(id: string): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'> | null>;
export declare function updateUser(id: string, updates: Partial<Omit<IUser, 'id' | 'role' | 'createdAt' | 'passwordHash'>>): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'> | null>;
export declare function getAllUsers(): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'>[]>;
export declare function updateUserRole(id: string, role: UserRole): Promise<Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'> | null>;
export declare function deleteUser(id: string, currentUserId: string, currentUserRole: UserRole): Promise<void>;
export declare function seedAdminIfMissing(): Promise<void>;
export declare function verifyToken(token: string): {
    id: string;
    email: string;
    role: UserRole;
};
