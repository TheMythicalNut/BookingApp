import type { CorsOptions } from "cors";

const allowedOrigins = new Set<string>([
  "https://spletka.com"
]);

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:*");
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // origin: string | undefined
    if (!origin) {
      return callback(null, false);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, origin);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 600
};
