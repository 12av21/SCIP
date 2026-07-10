"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        console.log('Attempting to connect to MongoDB with URI:', mongoURI ? 'URI_PROVIDED' : 'URI_MISSING'); // Log URI presence
        if (!mongoURI) {
            throw new Error('mongoURI is not defined in environment variables.');
        }
        await mongoose_1.default.connect(mongoURI);
        console.log('MongoDB Connected...');
    }
    catch (err) {
        console.error(err.message);
        process.exit(1); // Exit process with failure
    }
};
exports.default = connectDB;
