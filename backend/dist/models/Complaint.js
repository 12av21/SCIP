"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ComplaintSchema = new mongoose_1.Schema({
    id: { type: String }, // Custom string identifier from frontend/json seeds
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending', required: true },
    createdAt: { type: mongoose_1.Schema.Types.Mixed, default: Date.now },
    lat: { type: Number },
    lng: { type: Number },
    aiSuggestion: { type: mongoose_1.Schema.Types.Mixed, default: null }
});
// Ensure virtual 'id' is set and serialization cleans up fields
ComplaintSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        const obj = ret;
        // If the custom id string exists, use it. Otherwise fall back to Mongoose _id.
        obj.id = obj.id || (obj._id ? obj._id.toString() : '');
        delete obj._id;
        delete obj.__v;
        return obj;
    }
});
const Complaint = (0, mongoose_1.model)('Complaint', ComplaintSchema);
exports.default = Complaint;
