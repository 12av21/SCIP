import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../types/scip.js';

export interface IUserDocument extends Document {
  id: string;
  clerkUserId?: string;
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
  // Verification status (parity with domain User type)
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationTokenExpiresAt?: string;
  phoneVerificationOtpHash?: string;
  phoneVerificationOtpExpiresAt?: string;
  verificationAttempts: number;
  lastVerificationSentAt?: string;
  // Residence location (additive, preserves existing records)
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  pinCode?: string;
  residenceAddress?: string;
  // Officer geographic jurisdiction (additive)
  jurisdictionStateIds?: string[];
  jurisdictionDistrictIds?: string[];
  jurisdictionSubDistrictIds?: string[];
  jurisdictionBlockIds?: string[];
  jurisdictionLocalityIds?: string[];
  createdAt: string;
  updatedAt: string;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    // Optional Clerk identity (Phase 3.1.2A). Not auto-populated. Uniqueness is
    // enforced by a partial unique index below so unlinked users (field absent)
    // remain valid and multiple unlinked users never collide.
    clerkUserId: { type: String },
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
    // Verification status (parity with domain User type)
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String },
    emailVerificationTokenExpiresAt: { type: String },
    phoneVerificationOtpHash: { type: String },
    phoneVerificationOtpExpiresAt: { type: String },
    verificationAttempts: { type: Number, default: 0 },
    lastVerificationSentAt: { type: String },
    // Residence location (additive, preserves existing records)
    stateId: { type: String },
    districtId: { type: String },
    subDistrictId: { type: String },
    blockId: { type: String },
    localityId: { type: String },
    pinCode: { type: String },
    residenceAddress: { type: String },
    // Officer geographic jurisdiction (additive)
    jurisdictionStateIds: { type: [String], default: undefined },
    jurisdictionDistrictIds: { type: [String], default: undefined },
    jurisdictionSubDistrictIds: { type: [String], default: undefined },
    jurisdictionBlockIds: { type: [String], default: undefined },
    jurisdictionLocalityIds: { type: [String], default: undefined },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  { timestamps: false }
);

// Phase 3.1.2A: Partial unique index so a Clerk identity maps to at most one
// SCIP user. partialFilterExpression ensures only documents that actually carry a
// string clerkUserId are indexed, leaving unlinked users (field absent) valid.
UserSchema.index(
  { clerkUserId: 1 },
  { unique: true, partialFilterExpression: { clerkUserId: { $type: 'string' } }, name: 'uniq_user_clerkUserId' }
);

// Composite indexes for common query patterns
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ departmentId: 1, role: 1 });

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
