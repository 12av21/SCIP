import mongoose, { Schema, Document } from 'mongoose';
import { ReportCategory, IncidentStatus, IncidentPriority, UrgencyLevel } from '../../types/scip.js';

export interface IIncidentDocument extends Document {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  reportIds: string[];
  severity: UrgencyLevel;
  priority: IncidentPriority | 'P1' | 'P2' | 'P3' | 'P4';
  confidence: number;
  status: IncidentStatus;
  isAIGenerated: boolean;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  assignedDepartmentId?: string;
  assignedDepartmentName?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

const IncidentSchema = new Schema<IIncidentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    locationName: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusMeters: { type: Number, default: 500 },
    reportIds: [{ type: String }],
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    priority: { type: String, enum: ['P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW', 'P1', 'P2', 'P3', 'P4'], default: 'P3_MEDIUM', index: true },
    confidence: { type: Number, default: 0.8 },
    status: {
      type: String,
      enum: ['potential', 'under_review', 'confirmed', 'in_progress', 'resolved', 'closed', 'dismissed'],
      default: 'potential',
      index: true
    },
    isAIGenerated: { type: Boolean, default: true },
    humanReviewed: { type: Boolean, default: false, index: true },
    reviewedBy: { type: String },
    reviewedAt: { type: String },
    reviewNotes: { type: String },
    assignedDepartmentId: { type: String, index: true },
    assignedDepartmentName: { type: String },
    assignedOfficerId: { type: String, index: true },
    assignedOfficerName: { type: String },
    resolutionNotes: { type: String },
    resolvedAt: { type: String },
    evidence: [{ type: String }],
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true }
  },
  { timestamps: false }
);

IncidentSchema.index({ latitude: 1, longitude: 1 });
IncidentSchema.index({ createdAt: -1 });

export const IncidentModel = mongoose.models.Incident || mongoose.model<IIncidentDocument>('Incident', IncidentSchema);
