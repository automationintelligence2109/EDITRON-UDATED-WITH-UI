import { getRateLimitRedis } from "@/lib/redis";

type LocalRateBucket = { count: number; resetAt: number };
const localRateLimits = globalThis as typeof globalThis & {
  editronLocalRateLimits?: Map<string, LocalRateBucket>;
};
const localBuckets = localRateLimits.editronLocalRateLimits ??= new Map();

const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("PTTL", KEYS[1]) }
`;

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error("Rate-limit settings must be positive integers.");
  }

  if (process.env.NODE_ENV !== "production" && !process.env.REDIS_URL) {
    const now = Date.now();
    let bucket = localBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (localBuckets.size >= 1000) {
        for (const [bucketKey, value] of localBuckets) {
          if (value.resetAt <= now) localBuckets.delete(bucketKey);
        }
      }
      bucket = { count: 0, resetAt: now + windowMs };
      localBuckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const result = await getRateLimitRedis().eval(
    RATE_LIMIT_SCRIPT,
    1,
    `editron:rate-limit:${key}`,
    String(windowMs),
  );
  if (!Array.isArray(result) || result.length !== 2) {
    throw new Error("Redis returned an invalid rate-limit result.");
  }

  const count = Number(result[0]);
  const ttl = Number(result[1]);
  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error("Redis returned an invalid rate-limit result.");
  }

  return {
    allowed: count <= limit,
    retryAfterSeconds: count <= limit ? 0 : Math.max(1, Math.ceil(ttl / 1000)),
  };
}
