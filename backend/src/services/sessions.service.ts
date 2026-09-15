
import { getPool } from "../config/db.js";
import type { AdminSession, Session } from "../types/session.js";
import crypto from "crypto";

export async function findSessionByToken(token: string): Promise<Session | null> {
  const tokenLookup = crypto.createHash("sha256").update(token).digest("hex");

  const result = await getPool().query<Session>(
    `SELECT * FROM sessions WHERE token = $1 LIMIT 1`,
    [tokenLookup]
  );

  return result.rows[0] ?? null;
}

export async function findAdminSessionByToken(token: string): Promise<AdminSession | null> {
  const tokenLookup = crypto.createHash("sha256").update(token).digest("hex");
  const result = await getPool().query<Session>(
    `SELECT * FROM admin_sessions WHERE token = $1 LIMIT 1`,
    [tokenLookup]
  );

  return result.rows[0] ?? null;
}


export async function createSession(params: {
  ownerId: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO sessions (owner_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [params.ownerId, params.token, params.expiresAt]
  );
}

export async function createAdminSession(params: {
    token: string;
    expiresAt: Date;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO admin_sessions (token, expires_at)
     VALUES ($1, $2)`,
    [params.token, params.expiresAt]
  );
}