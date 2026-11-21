// SCIP MongoDB & Mongoose Lifecycle Manager (Phase 1)
// Provides connection lifecycle, environment validation, health checks, and graceful shutdown.
// NOTE: Runtime application persistence remains the file-backed SCIPDatabase until Mongo repositories
// are explicitly integrated and verified. This module manages Mongoose connectivity only (isolated dev).

import mongoose from 'mongoose';

type MongoConnectState = 'disabled' | 'connecting' | 'connected' | 'disconnected' | 'error';

let connectState: MongoConnectState = 'disabled';
let lastError: string | null = null;
let listenersRegistered = false;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function safeLog(message: string): void {
  // Never log URIs, credentials, or driver error details that may contain secrets.
  if (!isProd()) console.log(message);
}

function safeWarn(message: string): void {
  if (isProd()) {
    console.warn('[SCIP Database] MongoDB connection unavailable. Active disk-persisted database engine operational.');
  } else {
    console.warn(message);
  }
}

export function getMongoRuntimeStatus() {
  const readyState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  const stateMap: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    driverState: stateMap[readyState] || String(readyState),
    connectState,
    configured: Boolean(process.env.MONGODB_URI),
    dbName: readyState === 1 ? (mongoose.connection.name || null) : null,
    lastError: isProd() ? (lastError ? 'unavailable' : null) : lastError,
  };
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function validateMongoEnvironment(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    warnings.push('MONGODB_URI not set; MongoDB connectivity disabled (file-backed runtime remains active).');
    return { ok: true, warnings };
  }
  // Allow Atlas (mongodb+srv / mongodb.net) only in explicit development mode with an isolated dev db name.
  const isDev = process.env.NODE_ENV === 'development';
  const lower = uri.toLowerCase();
  const isAtlas = lower.includes('mongodb.net') || lower.includes('mongodb+srv://');
  if (isAtlas && !isDev) {
    warnings.push('Atlas URIs are only permitted in development mode (NODE_ENV=development).');
    return { ok: false, warnings };
  }
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    warnings.push('MONGODB_URI format is invalid (expected mongodb:// or mongodb+srv://).');
    return { ok: false, warnings };
  }
  return { ok: true, warnings };
}

function registerConnectionListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;
  mongoose.connection.on('connected', () => {
    connectState = 'connected';
    lastError = null;
    safeLog('[SCIP Database] Mongoose connection established.');
  });
  mongoose.connection.on('disconnected', () => {
    if (connectState !== 'disabled') connectState = 'disconnected';
  });
  mongoose.connection.on('error', () => {
    connectState = 'error';
    lastError = 'connection_error';
    // Never log error object/URI.
  });
}

export async function initMongoConnection(): Promise<boolean> {
  mongoose.set('bufferCommands', false); // Fail fast, never hang server
  registerConnectionListeners();

  const validation = validateMongoEnvironment();
  if (!validation.ok) {
    connectState = 'error';
    lastError = 'invalid_or_unsafe_mongodb_uri';
    if (!isProd()) {
      console.warn('[SCIP Database] Refusing MongoDB connection:', validation.warnings.join(' '));
    } else {
      console.warn('[SCIP Database] MongoDB connection skipped due to environment validation.');
    }
    return false;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    connectState = 'disabled';
    safeLog('[SCIP Database] MONGODB_URI not specified. Using active disk-persisted database engine.');
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    connectState = 'connected';
    return true;
  }

  try {
    connectState = 'connecting';
    safeLog('[SCIP Database] Attempting connection to MongoDB (isolated environment)...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    connectState = 'connected';
    lastError = null;
    const dbName = mongoose.connection.name || 'unknown';
    safeLog(`[SCIP Database] MongoDB connected successfully (isolated db: ${dbName}; runtime persistence remains file-backed unless explicit runtime gates enable Mongo).`);
    return true;
  } catch {
    connectState = 'error';
    lastError = 'connect_failed';
    safeWarn('[SCIP Database] MongoDB connection skipped (connection unavailable). Active disk-persisted database engine operational.');
    return false;
  }
}

export async function closeMongoConnection(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch {
    // ignore disconnect errors during shutdown; never log sensitive details
  } finally {
    if (connectState !== 'disabled') connectState = 'disconnected';
  }
}
