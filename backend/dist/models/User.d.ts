export type UserRole = "citizen" | "admin" | "super_admin";
export interface User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: string;
}
export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
}
export declare function toSafeUser(user: User): SafeUser;
