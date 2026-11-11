// SCIP MongoDB & Mongoose Lifecycle Manager
import mongoose from 'mongoose';

export async function initMongoConnection(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;

  mongoose.set('bufferCommands', false); // Fail fast, never hang server

  if (!mongoUri) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SCIP Database] MONGODB_URI not specified. Using active disk-persisted database engine.');
    }
    return false;
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SCIP Database] Attempting connection to MongoDB...');
    }
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SCIP Database] MongoDB connected successfully.');
    }
    return true;
  } catch (err: any) {
    const detail = process.env.NODE_ENV === 'production' ? '' : ` (${err?.message || 'error'})`;
    console.warn(`[SCIP Database] MongoDB connection skipped${detail}. Active disk-persisted database engine operational.`);
    return false;
  }
}
