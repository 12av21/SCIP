// SCIP Production-Safe Logging (Phase 12)
// Structured, redacted logging layer. Never logs raw URIs, credentials, JWTs, API keys, or PII.
// In production, logs at info+ only; sensitive details are redacted regardless of level.

type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_PATTERNS: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*[^\s,]+/gi,
  /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g,
];

function redact(input: unknown): string {
  if (input === undefined || input === null) return "";
  let s: string;
  try { s = typeof input === "string" ? input : JSON.stringify(input); }
  catch { s = String(input); }
  for (const re of SENSITIVE_PATTERNS) s = s.replace(re, "[redacted]");
  if (s.length > 500) s = s.slice(0, 497) + "...";
  return s;
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.SCIP_LOG_LEVEL === "silent") return false;
  if (level === "debug") return process.env.NODE_ENV !== "production";
  return true;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const entry = { level, message: redact(message), context: context ? redact(context) : undefined, ts: new Date().toISOString() };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
  redact,
};