import { getPool } from "../config/db.js";
import { formatEuropeanPrice } from "../config/util.js";
import type { AddonDB, Package, PackageDB, PackageOptions } from "../types/packages.js";
import type { Addon } from "../types/services.js";

export const mapPackage = (row: PackageDB): Package => ({
  id:             row.id,
  name:           row.name,
  link:           row.link,
  price:          formatEuropeanPrice(row.price),
  currency:       row.currency,
  discount:       row.discount,
  duration:       row.duration_minutes,
  description:    row.description ?? '',
  isReservable:   row.is_reservable,
  prerequirement: row.prerequirement_id ?? '',
  addons:         (row.addons ?? []).map(mapAddon),
  services:       row.services ?? [],
  studio:         row.studio_id,
});

export const mapAddon = (a: AddonDB): Addon => ({
  id:            a.id,
  name:          a.name,
  price:         a.price,
  durationDelta: a.duration_delta_minutes ?? 0,
  group:         a.group_id ?? '',
  isExclusive:   a.is_exclusive,
});

/**
 * Base SELECT with relational aggregation
 */
const baseSelect = `
  SELECT
    s.*,
    COALESCE(
      json_agg(
        DISTINCT jsonb_build_object(
          'id', pa.id,
          'name', pa.name,
          'price', pa.price,
          'durationDelta', pa.duration_delta_minutes,
          'group', pa.group_id,
          'isExclusive', pa.is_exclusive
        )
      ) FILTER (WHERE pa.id IS NOT NULL),
      '[]'
    ) AS addons,
    COALESCE(
      json_agg(DISTINCT sp.service_id)
      FILTER (WHERE sp.service_id IS NOT NULL),
      '[]'
    ) AS services
  FROM studio_packages s
  LEFT JOIN package_addons pa ON pa.package_id = s.id
  LEFT JOIN service_packages sp ON sp.package_id = s.id
`;

/**
 * GROUP BY clause (must include all non-aggregated columns)
 */
const groupBy = `
  GROUP BY
    s.id
`;

export const getPackageByLink = async (link: string): Promise<Package | null> => {
  const query = `
    ${baseSelect}
    INNER JOIN studios st ON st.id = s.studio_id
    WHERE s.deleted_at IS NULL AND s.link = $1
    AND st.published = TRUE
    ${groupBy}
  `;

  const { rows } = await getPool().query<PackageDB>(query, [link]);

  if(rows.length === 0) return null;
  return mapPackage(rows[0]!);
};

export const getPackageById = async (id: string): Promise<Package | null> => {
  const query = `
    ${baseSelect}
    INNER JOIN studios st ON st.id = s.studio_id
    WHERE s.deleted_at IS NULL AND s.id = $1
    AND st.published = TRUE
    ${groupBy}
  `;

  const { rows } = await getPool().query<PackageDB>(query, [id]);

  if (rows.length === 0) return null;

  return mapPackage(rows[0]!);
};
export const getPackagesByIds = async (ids: string[]): Promise<Package[]> => {
  if (ids.length === 0) return [];

  const query = `
    ${baseSelect}
    INNER JOIN studios st ON st.id = s.studio_id
    WHERE s.deleted_at IS NULL AND s.id = ANY($1)
    AND st.published = TRUE
    ${groupBy}
  `;

  const { rows } = await getPool().query<PackageDB>(query, [ids]);

  return rows.map(mapPackage);
};
export const getPackagesByOptions = async (
  options: PackageOptions
): Promise<Package[]> => {
  const values: any[] = [];
  const conditions: string[] = [];
  const joins: string[] = [];
  let paramIndex = 1;

  joins.push(`
    INNER JOIN studios st ON st.id = s.studio_id
  `);

  // Location filtering (join studios)
  if (options.location) {
    conditions.push(`st.city = $${paramIndex++}`);
    values.push(options.location.city);

    conditions.push(`st.country = $${paramIndex++}`);
    values.push(options.location.country);
  }

  // Service type filtering (requires join table)
  if (options.serviceType) {
    joins.push(`
      INNER JOIN service_packages sp_filter ON sp_filter.package_id = s.id
      INNER JOIN studio_services ss ON ss.id = sp_filter.service_id
    `);

    conditions.push(`ss.type::jsonb @> $${paramIndex++}::jsonb`);
    values.push(JSON.stringify([options.serviceType]));
  }
  
  // Include specific IDs
  if (options.include?.length) {
    conditions.push(`s.id = ANY($${paramIndex++})`);
    values.push(options.include);
  }

  // Exclude specific IDs
  if (options.exclude?.length) {
    conditions.push(`NOT (s.id = ANY($${paramIndex++}))`);
    values.push(options.exclude);
  }

  conditions.push(`st.published = TRUE`);
  conditions.push(`st.visible = TRUE`);
  conditions.push(`s.deleted_at IS NULL`)
  
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limitClause =
    options.amount && options.amount > 0
      ? `LIMIT ${Number(options.amount)}`
      : "";

  const query = `
    SELECT *
    FROM (
      ${baseSelect}
      ${joins.join("\n")}
      ${whereClause}
      ${groupBy}
    ) AS s
    ORDER BY s.created_at DESC
    ${limitClause}
  `;

  const { rows } = await getPool().query<PackageDB>(query, values);

  return rows.map(mapPackage);
};