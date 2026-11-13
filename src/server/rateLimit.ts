// SCIP Rate Limiter (Phase 12 - distributed-capable, in-memory fallback)
// Single-process best-effort in-memory store is the default. For multi-instance deployments,
// provide a shared store via SCIP_RATE_LIMIT_STORE (e.g. ioredis) or a reverse-proxy/WAF layer.
// Never logs IP/user identifiers beyond the configured log level.

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number> | number;
  reset(key: string): void;
  close?(): void;
}

class InMemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  increment(key: string, windowMs: number): number {
    const now = Date.now();
    if (this.buckets.size > 5000) {
      for (const [k, v] of this.buckets) { if (now > v.resetAt) this.buckets.delete(k); }
    }
    const existing = this.buckets.get(key);
    if (!existing || now > existing.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }
  reset(key: string): void { this.buckets.delete(key); }
}

export function createRateLimitStore(): RateLimitStore {
  const storeType = (process.env.SCIP_RATE_LIMIT_STORE || "memory").toLowerCase().trim();
  if (storeType === "redis" || storeType === "ioredis") {
    try {
      const Redis = require("ioredis");
      const client = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379/0", { lazyConnect: true });
      const store: RateLimitStore = {
        async increment(key: string, windowMs: number): Promise<number> {
          const bucketKey = "ratelimit:" + key;
          const multi = client.multi();
          multi.incr(bucketKey);
          multi.expire(bucketKey, Math.ceil(windowMs / 1000));
          const results = await multi.exec();
          return Number(results?.[0]?.[1] ?? 1);
        },
        reset(key: string): void { client.del("ratelimit:" + key).catch(() => {}); },
        close(): void { client.quit().catch(() => {}); },
      };
      return store;
    } catch {
      // Fall back to in-memory if redis client unavailable.
    }
  }
  return new InMemoryStore();
}

export function getRateLimitKey(req: any): string {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const path = req.path || "";
  return ip + ":" + (path.startsWith("/api/auth") ? "auth" : "api");
}