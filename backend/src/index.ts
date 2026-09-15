import type { Pool } from "pg";

const PG_RETRIES = parseInt(process.env.PG_RETRIES ?? "10", 10);
const PG_RETRY_DELAY = parseInt(process.env.PG_RETRY_DELAY ?? "2000", 10);

async function waitForPostgres(
  retries = PG_RETRIES, 
  baseDelay = PG_RETRY_DELAY
): Promise<void> {
  const { getPool } = await import("./config/db.js");

  for (let i = 0; i < retries; i++) {
    let pool: Pool;
    try {
      pool = getPool();
    } catch (err) {
      console.warn({
        message: "Failed to construct Postgres pool",
        attempt: i + 1,
        retries,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) =>
        setTimeout(r, Math.min(baseDelay * Math.pow(2, i), 30_000))
      );
      continue;
    }

    try {
      await pool.query("SELECT 1");
      console.log({ message: "Postgres is ready" });
      return;
    } catch (err) {
      console.warn({
        message: "Postgres not ready yet",
        attempt: i + 1,
        retries,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) =>
        setTimeout(r, Math.min(baseDelay * Math.pow(2, i), 30_000))
      );
    }
  }
  throw new Error("Could not connect to Postgres after maximum retries");
}

(async () => {
  if (process.env.NODE_ENV === "development") {
    console.debug({
      message: "Runtime config",
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      NODE_ENV: process.env.NODE_ENV,
    });
  }

  await waitForPostgres();

  console.log({ message: "Starting Express server" });
  await import("./server.js");
})().catch((err) => {
  console.error({
    message: "Fatal startup error",
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});