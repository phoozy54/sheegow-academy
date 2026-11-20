/**
 * Lightweight in-process sliding-window rate limiter.
 *
 * NOTE: this is per server instance. On a multi-instance/serverless platform
 * (e.g. Vercel) use Upstash/Redis for a shared limiter. It still provides a
 * useful baseline against casual brute force and form spam.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  // Prevent unbounded growth from random keys.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "unknown";
}
