import { Schema, model, Document } from 'mongoose';

export interface IComplaint extends Document {
  id?: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  createdAt: Date | string;
  lat?: number;
  lng?: number;
  aiSuggestion?: any;
}

const ComplaintSchema = new Schema<IComplaint>({
  id: { type: String }, // Custom string identifier from frontend/json seeds
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending', required: true },
  createdAt: { type: Schema.Types.Mixed, default: Date.now },
  lat: { type: Number },
  lng: { type: Number },
  aiSuggestion: { type: Schema.Types.Mixed, default: null }
});

// Ensure virtual 'id' is set and serialization cleans up fields
ComplaintSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    const obj = ret as { [key: string]: any };
    // If the custom id string exists, use it. Otherwise fall back to Mongoose _id.
    obj.id = obj.id || (obj._id ? obj._id.toString() : '');
    delete obj._id;
    delete obj.__v;
    return obj;
  }
});

const Complaint = model<IComplaint>('Complaint', ComplaintSchema);

export default Complaint;
