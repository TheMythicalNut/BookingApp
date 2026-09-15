// admin service
import { getPool } from '../config/db.js';
import type { PoolClient, QueryResult } from 'pg';
import type { StudioDB } from '../types/studio.js';
import bcrypt from "bcrypt";
import type { OwnerDB } from '../types/owner.js';

/* =========================
   Types
========================= */

export type QueryType = 'select' | 'insert' | 'update' | 'delete';

export interface ExecuteOptions {
  timeoutMs?: number;
  maxRows?: number;
}

export interface SelectResult {
  type: 'select';
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface InsertResult {
  type: 'insert';
  rows: Record<string, unknown>[];
}

export interface DeleteResult {
  type: 'delete';
  rows: Record<string, unknown>[];
}

export interface UpdateChange {
  before: unknown;
  after: unknown;
}

export interface UpdateRow {
  id?: unknown;
  changes: Record<string, UpdateChange>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  diffWarning?: string;
}

export interface UpdateResult {
  type: 'update';
  rows: UpdateRow[];
}

export type AdminQueryResult =
  | SelectResult
  | InsertResult
  | DeleteResult
  | UpdateResult;

/* =========================
   Helpers
========================= */

function classifyQuery(sql: string): QueryType {
  const first = sql.trim().split(/\s+/)[0]?.toUpperCase();

  if (first === 'SELECT' || first === 'WITH') return 'select';
  if (first === 'INSERT') return 'insert';
  if (first === 'UPDATE') return 'update';
  if (first === 'DELETE') return 'delete';

  throw new Error(`Unsupported query type: ${first}`);
}

function ensureReturning(sql: string): string {
  const trimmed = sql.trim().replace(/;$/, '');

  if (/\bRETURNING\b/i.test(trimmed)) return trimmed;

  // INSERT ... SELECT: RETURNING must go at the very end of the outer INSERT,
  // not after the inner SELECT. Safe to append only if there's no CTE wrapping it.
  if (/^\s*INSERT\b[\s\S]+?\bSELECT\b/i.test(trimmed)) {
    const hasCTE = /^\s*WITH\b/i.test(trimmed);
    if (hasCTE) {
      throw new Error(
        'INSERT ... SELECT inside a CTE requires an explicit RETURNING clause — cannot append safely'
      );
    }
    return `${trimmed} RETURNING *`;
  }

  // CTE (WITH ...) that ends in INSERT/UPDATE/DELETE:
  // RETURNING goes at the end of the final data-modifying statement,
  // which is already the end of the string after our trim — safe to append.
  if (/^\s*WITH\b/i.test(trimmed)) {
    const finalStatement = trimmed.match(
      /\b(INSERT|UPDATE|DELETE)\b(?![\s\S]*\b(INSERT|UPDATE|DELETE)\b)/i
    );
    if (!finalStatement) {
      throw new Error(
        'CTE does not appear to end in a data-modifying statement — cannot append RETURNING safely'
      );
    }
    return `${trimmed} RETURNING *`;
  }

  // UPDATE without WHERE: affects all rows which is likely unintentional —
  // we allow it but log a warning so it doesn't go completely unnoticed
  if (/^\s*UPDATE\b/i.test(trimmed) && !/\bWHERE\b/i.test(trimmed)) {
    console.warn('[ADMIN] UPDATE without WHERE clause — all rows will be affected');
  }

  // DELETE without WHERE: same concern as UPDATE without WHERE
  if (/^\s*DELETE\b/i.test(trimmed) && !/\bWHERE\b/i.test(trimmed)) {
    console.warn('[ADMIN] DELETE without WHERE clause — all rows will be affected');
  }

  // RETURNING inside a subquery in the SET clause (Postgres doesn't support this,
  // but a naive regex check on the full string would have falsely detected it above)
  // Nothing to do here — the \bRETURNING\b check at the top already handles
  // any existing RETURNING correctly since we're past that gate.

  // Standard case: simple INSERT / UPDATE / DELETE — append at end
  return `${trimmed} RETURNING *`;
}

function wrapDelete(sql: string): string {
  return ensureReturning(sql);
}

function injectUpdatedAt(sql: string): string {
  // Already explicitly setting updated_at — don't double-inject
  if (/\bupdated_at\s*=/i.test(sql)) return sql;

  // Inject into SET clause: "SET col = val" → "SET updated_at = NOW(), col = val"
  return sql.replace(/\bSET\b/i, 'SET updated_at = NOW(),');
}

function extractUpdateParts(sql: string): { table: string; where: string } {
  const match = sql.match(
    /UPDATE\s+([a-zA-Z0-9_."']+)\s+SET[\s\S]+?WHERE\s+([\s\S]+)/i
  );

  if (!match) {
    throw new Error('Unable to parse UPDATE statement for diffing');
  }

  return {
    table: match[1] ?? '',
    where: (match[2] ?? '').replace(/;$/, '')
  };
}

function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, UpdateChange> {
  const changes: Record<string, UpdateChange> = {};

  for (const key of Object.keys(after)) {
    const b = before[key];
    const a = after[key];

    const bSerialized = b instanceof Date ? b.toISOString() : JSON.stringify(b);
    const aSerialized = a instanceof Date ? a.toISOString() : JSON.stringify(a);

    if (bSerialized !== aSerialized) {
      changes[key] = { before: b, after: a };
    }
  }

  return changes;
}

/* =========================
   Formatters
========================= */

function formatSelect(
  result: QueryResult,
  maxRows: number
): SelectResult {
  return {
    type: 'select',
    columns: result.fields.map(f => f.name),
    rows: result.rows.slice(0, maxRows)
  };
}

function formatInsert(result: QueryResult): InsertResult {
  return {
    type: 'insert',
    rows: result.rows
  };
}

function formatDelete(result: QueryResult): DeleteResult {
  return {
    type: 'delete',
    rows: result.rows
  };
}

function formatUpdate(
  beforeRows: Record<string, unknown>[],
  afterRows: Record<string, unknown>[]
): UpdateResult {
  const beforeById = new Map<unknown, Record<string, unknown>>();
  for (const row of beforeRows) {
    beforeById.set(row.id, row);
  }

  const rows: UpdateRow[] = afterRows.map(after => {
    const before = beforeById.get(after.id);
    if (!before) {
      return {id: after.id, before: {}, after, changes: {}, diffWarning: 'Before snapshot not found for this row - diff unavailable'}
    }

    return { id: after.id, before, after, changes: computeDiff(before, after)}
  });

  return { type: 'update', rows };
}

/* =========================
   Main Function
========================= */

export async function executeAdminQuery(
  sql: string,
  options: ExecuteOptions = {}
): Promise<AdminQueryResult> {
  const {
    timeoutMs = 5000,
    maxRows = 1000
  } = options;

  let client: PoolClient | null = null;
  let committed = false;

  try {
    client = await getPool().connect();

    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = ${timeoutMs}`);

    const type = classifyQuery(sql);

    let query = sql.trim().replace(/;$/, '');
    let result: QueryResult;

    switch (type) {
      case 'select': {
        result = await client.query(query);
        return formatSelect(result, maxRows);
      }

      case 'insert': {
        query = ensureReturning(query);
        result = await client.query(query);
        await client.query('COMMIT');
        committed = true;
        return formatInsert(result);
      }

      case 'delete': {
        query = wrapDelete(query);
        result = await client.query(query);
        await client.query('COMMIT');
        committed = true;
        return formatDelete(result);
      }

      case 'update': {
        try {
          const { table, where } = extractUpdateParts(sql);

          const beforeResult = await client.query(`SELECT * FROM ${table} WHERE ${where}`);
          const beforeRows = beforeResult.rows as Record<string, unknown>[];

          const hasUpdatedAt = beforeRows.length > 0 && 'updated_at' in beforeRows[0]!;
          if (hasUpdatedAt) { query = injectUpdatedAt(query); }

          const updateQuery = ensureReturning(query);
          result = await client.query(updateQuery);
          const afterRows = result.rows as Record<string, unknown>[];

          await client.query('COMMIT');
          committed = true;

          return formatUpdate(beforeRows, afterRows);
        } catch (err) {
          console.warn('[ADMIN] UPDATE diff failed, falling back:', sql);
          
          await client.query('ROLLBACK');
          await client.query('BEGIN');
          await client.query(`SET LOCAL statement_timeout = ${timeoutMs}`);
          
          result = await client.query(ensureReturning(query));
          await client.query('COMMIT');
          committed = true;

          return {
            type: 'update',
            rows: result.rows.map(r => ({
              id: (r as any).id,
              before: {},
              after: r,
              changes: {},
              diffWarning: 'Before/after diff unavailable — diff query failed'
            }))
          };
        }
      }

      default:
        throw new Error('Unsupported query type');
    }

  } catch ( err ) {
    if ( client && !committed ) {
      await client.query('ROLLBACK');
    }
    throw err;

  } finally {
    if (client) {
      if(!committed){
        await client.query('ROLLBACK').catch(() => {});
      }
      client.release();
    }
  }
}


export async function createOwner(
  params: {
    // OWNER
    first_name: string,
    last_name: string,
    email: string,
    password: string,
    // STUDIO
    name: string,
    link: string,
    country: string,
    city: string,
    street: string,
    building_number: string,
    apartment_number: string,
    latitude: number,
    longitude: number,
    time_zone: string
  }
): Promise<AdminQueryResult> {
  const pool = getPool();

  try {
    // Insert studio
    const insertStudioSql = `
      INSERT INTO studios 
        (name, link, country, city, street, building_number, apartment_number, latitude, longitude, time_zone)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const studioValues = [
      params.name,
      params.link,
      params.country,
      params.city,
      params.street,
      params.building_number,
      params.apartment_number,
      params.latitude,
      params.longitude,
      params.time_zone
    ];
    const studioResult = await pool.query<StudioDB>(insertStudioSql, studioValues);
    const studio = studioResult.rows[0];

    if (!studio) {
      throw new Error('Failed to create studio');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);

    const insertOwnerSql = `
      INSERT INTO owners
        (first_name, last_name, email, password_hash, studio_id)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const ownerValues = [
      params.first_name,
      params.last_name,
      params.email,
      passwordHash,
      studio.id
    ];
    const ownerResult = await pool.query<OwnerDB>(insertOwnerSql, ownerValues);
    const owner = ownerResult.rows[0];

    if (!owner) {
      throw new Error('Failed to create owner');
    }

    return {
      type: 'insert',
      rows: [
        { table: 'studios', data: studio },
        { table: 'owners', data: owner }
      ]
    } as AdminQueryResult;
  } catch (err) {
    console.error('[CREATE_OWNER_ERROR]', err);
    throw err;
  }
}