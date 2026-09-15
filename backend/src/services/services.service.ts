import { getPool } from "../config/db.js";
import { formatEuropeanPrice } from "../config/util.js";
import type { Service, ServiceDB, ServiceOptions } from "../types/services.js";
import { buildUrl } from "./media.service.js";

export const mapService = (row: ServiceDB): Service => ({
  localID:            '',
  id:                 row.id,
  name:               row.name,
  link:               row.link,
  price:              formatEuropeanPrice(row.price),
  currency:           row.currency,
  discount:           row.discount,
  duration:           row.duration_minutes,
  description:        row.description      ?? '',
  thumbnail:          row.thumbnail ? { url: buildUrl(row.thumbnail), key: row.thumbnail } : { url: '', key: ''},
  gallery: (row.gallery ?? []).map((img: any) => ({
    key: img.key,
    url: buildUrl(img.key),
    timestamp: img.timestamp
  })),

  isReservable:       row.is_reservable,
  addons:             row.addons           ?? [],
  prerequiredService: row.prerequirement_id ?? '',
  type:               JSON.parse(row.type   ?? '[]'),
  packages:           row.packages         ?? [],
  studio:             row.studio_id,
  category:           row.category         ?? '',
});

/**
 * Base SELECT with relational aggregation
 */
const baseSelect = `
SELECT
  s.*,

  -- addons
  COALESCE(a.addons, '[]') AS addons,

  -- images (ordered safely)
  COALESCE(i.gallery, '[]') AS gallery,

  -- packages
  COALESCE(p.packages, '[]') AS packages,

  -- category
  cs.category_id AS category

FROM studio_services s

-- Addons aggregated separately
LEFT JOIN LATERAL (
  SELECT json_agg(
           jsonb_build_object(
             'id', sa.id,
             'name', sa.name,
             'price', sa.price,
             'durationDelta', sa.duration_delta_minutes,
             'group', sa.group_id,
             'isExclusive', sa.is_exclusive
           )
         ) AS addons
  FROM (
    SELECT DISTINCT sa.id, sa.name, sa.price,
           sa.duration_delta_minutes,
           sa.group_id, sa.is_exclusive
    FROM service_addons sa
    WHERE sa.service_id = s.id
  ) sa
) a ON TRUE

-- Images aggregated separately (ordered properly)
LEFT JOIN LATERAL (
  SELECT json_agg(
           jsonb_build_object(
             'id',        si.id,
             'key',       si.key,
             'timestamp', EXTRACT(EPOCH FROM si.created_at)
           )
           ORDER BY si.display_order
         ) AS gallery
  FROM (
    SELECT DISTINCT ON (si.id)
           si.id,
           si.key,
           si.created_at,
           si.display_order
    FROM service_images si
    WHERE si.service_id = s.id
    ORDER BY si.id, si.display_order
  ) si
) i ON TRUE

-- Packages aggregated separately
LEFT JOIN LATERAL (
  SELECT json_agg(package_id) AS packages
  FROM (
    SELECT DISTINCT sp.package_id
    FROM service_packages sp
    WHERE sp.service_id = s.id
  ) sp
) p ON TRUE

-- Category
LEFT JOIN category_services cs ON cs.service_id = s.id

`;

export const getServiceByLink = async (link: string): Promise<Service | null> => {
  const query = `
    ${baseSelect}
    INNER JOIN studios st ON st.id = s.studio_id
    WHERE s.deleted_at IS NULL AND s.link = $1
    AND st.published = TRUE
  `;

  const { rows } = await getPool().query<ServiceDB>(query, [link]);

  if(rows.length === 0) return null;
  return mapService(rows[0]!);
};

export const getServiceById = async (id: string): Promise<Service | null> => {
  const query = `
    ${baseSelect}
    INNER JOIN studios st ON st.id = s.studio_id
    WHERE s.deleted_at IS NULL AND s.id = $1
    AND st.published = TRUE
  `;

  const { rows } = await getPool().query<ServiceDB>(query, [id]);

  if (rows.length === 0) return null;

  return mapService(rows[0]!);
};
export const getServicesByIds = async (ids: string[]): Promise<Service[]> => {
  if (ids.length === 0) return [];

  const query = `
    ${baseSelect}
    INNER JOIN studios st ON st.id = s.studio_id
    WHERE s.deleted_at IS NULL AND s.id = ANY($1)
    AND st.published = TRUE
  `;

  const { rows } = await getPool().query<ServiceDB>(query, [ids]);

  return rows.map(mapService);
};
export const getServicesByOptions = async (
  options: ServiceOptions
): Promise<Service[]> => {
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
    conditions.push(`s.type::jsonb @> $${paramIndex++}::jsonb`);
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
    ) AS s
    ORDER BY s.created_at DESC
    ${limitClause}
  `;

  const { rows } = await getPool().query<ServiceDB>(query, values);

  return rows.map(mapService);
};