import { Redis } from "ioredis";

if (!process.env.REDIS_HOST) { throw new Error("Missing environment variable: REDIS_HOST"); }
if (!process.env.REDIS_PORT) { throw new Error("Missing environment variable: REDIS_PORT"); }

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10);
if (Number.isNaN(REDIS_PORT)) { throw new Error("REDIS_PORT must be a valid number"); }


export const redis = new Redis({
  
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  
  retryStrategy: (times) => {
    if (times > 10) return null;
    return Math.min(times * 200, 5000);
  },
  maxRetriesPerRequest: 3
});

redis.on("error", (err) => {
  console.error({
    message: "Redis client error",
    host: REDIS_HOST,
    port: REDIS_PORT,
    error: err.message,
  });
});