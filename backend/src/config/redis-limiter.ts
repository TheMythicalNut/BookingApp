import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

// --- Redis setup ---
if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
  throw new Error("Redis configuration missing");
}

const REDIS_URL = process.env.REDIS_PASSWORD
  ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  : `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

await redisClient.connect();

const store = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.sendCommand(args)
});

const getIp = (req: any): string => {
  return req.ip || req.socket?.remoteAddress || "unknown";
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2500,

  standardHeaders: true,
  legacyHeaders: false,

  store,

  keyGenerator: (req): string => {
    return `ip:${getIp(req)}`;
  },

  handler: (req, res) => {
    console.warn("Global rate limit hit:", {
      ip: getIp(req),
      path: req.originalUrl
    });

    res.status(429).json({
      error: "Too many requests"
    });
  }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,

  standardHeaders: true,
  legacyHeaders: false,

  store,

  keyGenerator: (req): string => {
    // IP-based is correct for login
    return `auth:${getIp(req)}`;
  },

  handler: (req, res) => {
    console.warn("Auth rate limit hit:", {
      ip: getIp(req),
      path: req.originalUrl
    });

    res.status(429).json({
      error: "Too many login attempts"
    });
  }
});

export const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,

  standardHeaders: true,
  legacyHeaders: false,

  store,

  keyGenerator: (req: AuthenticatedRequest): string => {
    const ip = getIp(req);

    if (req.user?.ownerId) {
      return `owner:${req.user.ownerId}`;
    }

    if (req.user?.studioId) {
      return `studio:${req.user.studioId}`;
    }

    return `ip:${ip}`;
  },

  handler: (req, res) => {
    console.warn("User rate limit hit:", {
      ip: getIp(req),
      path: req.originalUrl
    });

    res.status(429).json({
      error: "Too many requests"
    });
  }
});


export const questionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,

  standardHeaders: true,
  legacyHeaders: false,

  store,

  keyGenerator: (req): string => {
    return `question:${getIp(req)}`;
  },

  handler: (req, res) => {
    console.warn("Question rate limit hit:", {
      ip: getIp(req),
      path: req.originalUrl
    });

    res.status(429).json({
      error: "Too many requests"
    });
  }
});