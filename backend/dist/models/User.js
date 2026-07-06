"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSafeUser = toSafeUser;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['citizen', 'admin', 'super_admin'], default: 'citizen', required: true },
    createdAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
});
// Virtual for 'id' to match frontend expectations, mapping _id to id
UserSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
// Ensure virtuals are included in toJSON output and transform the object
UserSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        const obj = ret; // Cast to a type that allows arbitrary property deletion
        delete obj._id;
        delete obj.__v;
        delete obj.passwordHash; // Never send password hash to the frontend
        delete obj.passwordResetToken; // Don't send reset tokens to frontend
        delete obj.passwordResetExpires; // Don't send reset tokens to frontend
        return obj;
    }
});
// Function to convert a Mongoose user document to a safe user object for the frontend
function toSafeUser(user) {
    const userObject = user.toJSON(); // Use toJSON to include virtuals and transformations
    return userObject;
}
const User = (0, mongoose_1.model)('User', UserSchema);
exports.default = User;
