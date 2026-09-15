import type { Owner, OwnerDB, OwnerOptions } from "../types/owner.js";
import { getPool } from "../config/db.js";
import { compare } from "bcrypt";

/**
 * Maps DB row to domain model
 */
export const mapOwner = (row: OwnerDB): Owner => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  setupState: row.setup_state,
  status: row.status,
  studio: row.studio_id,
});

/**
 * Get single owner by ID
 */
export const getOwnerById = async (id: string): Promise<Owner | null> => {
  const { rows } = await getPool().query<OwnerDB>(
    `
    SELECT id, first_name, last_name, email, setup_state, status, studio_id
    FROM owners
    WHERE id = $1
    `,
    [id]
  );

  if (rows.length === 0) return null;
  return mapOwner(rows[0]!);
};

/**
 * Batch lookup by IDs
 */
export const getOwnersByIds = async (ids: string[]): Promise<Owner[]> => {
  if (ids.length === 0) return [];

  const { rows } = await getPool().query<OwnerDB>(
    `
    SELECT id, first_name, last_name, email, setup_state, status, studio_id
    FROM owners
    WHERE id = ANY($1)
    `,
    [ids]
  );

  return rows.map(mapOwner);
};

/**
 * Dynamic filtering with optimized joins
 */
export const getOwnersByOptions = async (
  options: OwnerOptions
): Promise<Owner[]> => {
  const values: any[] = [];
  const conditions: string[] = [];
  const joins: string[] = [];

  let paramIndex = 1;

  // Filter by owner id
  if (options.owner) {
    conditions.push(`o.id = $${paramIndex++}`);
    values.push(options.owner);
  }

  // Filter by studio
  if (options.studio) {
    conditions.push(`o.studio_id = $${paramIndex++}`);
    values.push(options.studio);
  }

  // Filter by service (requires join)
  if (options.service) {
    joins.push(`INNER JOIN services s ON s.studio_id = o.studio_id`);
    conditions.push(`s.id = $${paramIndex++}`);
    values.push(options.service);
  }

  // Filter by package (requires join)
  if (options.package) {
    joins.push(`INNER JOIN packages p ON p.studio_id = o.studio_id`);
    conditions.push(`p.id = $${paramIndex++}`);
    values.push(options.package);
  }

  // Filter by reservation (requires join)
  if (options.reservation) {
    joins.push(`INNER JOIN reservations r ON r.owner_id = o.id`);
    conditions.push(`r.id = $${paramIndex++}`);
    values.push(options.reservation);
  }

  // Filter by session token
  if (options.token) {
    joins.push(`INNER JOIN sessions sess ON sess.owner_id = o.id`);
    conditions.push(`sess.token = $${paramIndex++}`);
    values.push(options.token);
  }

  // Filter by location
  if (options.location) {
    joins.push(`
      INNER JOIN studios st ON st.id = o.studio_id
    `);

    conditions.push(`st.city = $${paramIndex++}`);
    values.push(options.location.city);

    conditions.push(`st.country = $${paramIndex++}`);
    values.push(options.location.country);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT DISTINCT
      o.id,
      o.first_name,
      o.last_name,
      o.email,
      o.setup_state,
      o.status,
      o.studio_id
    FROM owners o
    ${joins.join("\n")}
    ${whereClause}
  `;

  const { rows } = await getPool().query<OwnerDB>(query, values);
  return rows.map(mapOwner);
};


/**
 * Get single owner by Email & Password
 */
export async function findOwnerByEmailAndPassword(
  email: string,
  password: string
): Promise<Owner | null> {
  const result = await getPool().query<OwnerDB>(
    `SELECT * FROM owners WHERE email = $1 LIMIT 1`,
    [email]
  );

  const owner = result.rows[0] ?? null;

  if (!owner || !owner.password_hash) return null;

  const match = await compare(password, owner.password_hash);

  return match ? mapOwner(owner) : null;
}