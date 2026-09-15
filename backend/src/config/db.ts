import pg from "pg";
const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {

    const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "NODE_ENV"];
    for (const key of required) {
      if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    }

    console.log("Creating new pool with config:", {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      // NEVER LOG DB_USER, DB_PASSWORD
    });
    
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? '') || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === "true" 
      ? { rejectUnauthorized: process.env.NODE_ENV !== "production" }
      : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on("connect", () => {
      console.log("Connected to PostgreSQL");
    });

    pool.on("error", (err: Error) => {
      console.error("Unexpected PG error", err);
      //process.exit(1);
    });
  }
  return pool;
}