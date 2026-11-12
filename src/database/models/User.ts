import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../types/scip.js';

export interface IUserDocument extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  phone?: string;
  status: 'active' | 'suspended';
  sessionVersion?: number;
  credentialsResetRequired?: boolean;
  createdAt: string;
  updatedAt: string;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'dept_officer', 'analyst', 'authority', 'admin'],
      default: 'citizen',
      index: true
    },
    departmentId: { type: String },
    departmentName: { type: String },
    phone: { type: String },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    sessionVersion: { type: Number, default: 0 },
    credentialsResetRequired: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  { timestamps: false }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
