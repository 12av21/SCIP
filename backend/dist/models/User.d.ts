import { Document } from 'mongoose';
export type UserRole = 'citizen' | 'admin' | 'super_admin';
export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    isVerified: boolean;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
}
export declare function toSafeUser(user: IUser): Omit<IUser, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | '_id' | '__v'>;
declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default User;
