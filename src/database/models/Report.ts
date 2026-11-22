import mongoose, { Schema, Document } from 'mongoose';
import { ReportCategory, ReportStatus, UrgencyLevel, LocationSource } from '../../types/scip.js';

export interface IReportDocument extends Document {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  subcategory?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  status: ReportStatus;
  urgency: UrgencyLevel;
  incidentId?: string;
  images?: string[];
  // India location context (additive, preserves existing records)
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  pinCode?: string;
  locationSource?: LocationSource;
  locationAccuracyMeters?: number;
  locationConfirmedAt?: string;
  // Complaint-specific address details (distinct from citizen residence)
  address?: string;
  landmark?: string;
  createdAt: string;
  updatedAt: string;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'Water & Drainage',
        'Roads & Traffic',
        'Public Sanitation',
        'Power & Lighting',
        'Parks & Environment',
        'Structural Safety',
        'Public Health',
        'Noise & Disturbance'
      ],
      required: true,
      index: true
    },
    subcategory: { type: String },
    locationName: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    citizenId: { type: String, required: true, index: true },
    citizenName: { type: String, required: true },
    citizenEmail: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'submitted',
        'processing',
        'analyzed',
        'linked',
        'under_review',
        'assigned',
        'resolved',
        'closed'
      ],
      default: 'submitted',
      index: true
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    incidentId: { type: String, index: true },
    images: [{ type: String }],
    // India location context (additive, preserves existing records)
    stateId: { type: String },
    districtId: { type: String },
    subDistrictId: { type: String },
    blockId: { type: String },
    localityId: { type: String },
    pinCode: { type: String, index: true },
    locationSource: { type: String, enum: ['gps', 'manual_map', 'geocoded', 'preset'] },
    locationAccuracyMeters: { type: Number },
    locationConfirmedAt: { type: String },
    // Complaint-specific address details (distinct from citizen residence)
    address: { type: String },
    landmark: { type: String },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true }
  },
  { timestamps: false }
);

ReportSchema.index({ latitude: 1, longitude: 1 });
ReportSchema.index({ createdAt: -1 });
// Composite index for citizen-scoped report queries
ReportSchema.index({ citizenId: 1, status: 1 });
// Composite index for incident-linked report queries
ReportSchema.index({ incidentId: 1, status: 1 });

export const ReportModel = mongoose.models.Report || mongoose.model<IReportDocument>('Report', ReportSchema);
