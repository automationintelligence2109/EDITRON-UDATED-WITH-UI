import Redis from "ioredis";

let rateLimitClient: Redis | null = null;

function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for distributed rate limits and video jobs.");
  }
  return redisUrl;
}

export function getRateLimitRedis(): Redis {
  if (!rateLimitClient) {
    rateLimitClient = new Redis(getRedisUrl(), {
      connectTimeout: 5_000,
      maxRetriesPerRequest: 1,
    });
  }
  return rateLimitClient;
}

export function createQueueRedisConnection(): Redis {
  return new Redis(getRedisUrl(), {
    connectTimeout: 5_000,
    maxRetriesPerRequest: null,
  });
}
