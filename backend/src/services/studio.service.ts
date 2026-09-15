import { getPool } from "../config/db.js";
import type { ExceptionAppliesTo } from "../types/exception.js";
import type { Studio, StudioDB, StudioOptions } from "../types/studio.js";
import { buildUrl } from "./media.service.js";


const mapStudio = (row: any): Studio => ({
  id: row.id,
  name: row.name,
  score: row.score,

  type: JSON.parse(row.type ?? '[]'),
  searchTags: JSON.parse(row.search_tags ?? '[]'),

  link: row.link,
  instagramLink: row.instagram_link ?? "",
  facebookLink: row.facebook_link ?? "",
  contactEmail: row.contact_email ?? "",
  contactPhone: row.contact_phone ?? "",
  whatsAppPhone: row.whatsapp_phone ?? "",

  country: row.country,
  city: row.city,
  street: row.street,
  buildingNumber: row.building_number,
  apartmentNumber: row.apartment_number,

  latitude: row.latitude,
  longitude: row.longitude,

  timeZone: row.time_zone,

  minScheduleAhead: row.min_schedule_ahead,
  maxScheduleAhead: row.max_schedule_ahead,

  thumbnail: row.thumbnail ? buildUrl(row.thumbnail) : "",

  heroImages: (row.images ?? []).map((img: any) => ({
    id: img.id,
    url: buildUrl(img.key),
    displayOrder: img.display_order
  })),

  emailReminders: row.email_reminders,
  smsReminders: row.sms_reminders,

  weeklySchedules: (row.weekly_schedules ?? []).map((ws: any) => ({
    id: ws.id,
    effectiveFrom: ws.effective_from ?? undefined,
    effectiveTo: ws.effective_to ?? undefined,
    days: (ws.days ?? []).map((d: any) => ({
      dayOfWeek: d.day_of_week,
      isClosed: d.is_closed,
      intervals: (d.intervals ?? []).map((i: any) => ({
        start: i.start_time,
        end: i.end_time
      }))
    }))
  })),

  exceptions: (row.exceptions ?? []).map((e: any) => ({
    id: e.id,
    label: e.label ?? "",
    isClosed: e.is_closed,
    appliesTo: (e.applies_to ?? []).map((rule: any): ExceptionAppliesTo => {
      switch (rule.type) {
        case "oneOff":
          return { type: "oneOff", date: rule.date };
        case "range":
          return { type: "range", startDate: rule.start_date, endDate: rule.end_date };
        case "annual":
          return { type: "annual", month: rule.month, day: rule.day };
        default:
          throw new Error(`Unknown exception date rule type: ${rule.type}`);
      }
    }),
    intervals: (e.intervals ?? []).map((i: any) => ({
      start: i.start_time,
      end: i.end_time
    }))
  })),

  available: [],

  owner: row.owner,

  services: row.services ?? [],

  categories: (row.categories ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    services: c.services ?? []
  })),

  packages: row.packages ?? []
});

/**
 * Base SELECT with relational aggregation
 */
const baseSelect = `
  SELECT
    s.*,

    /* ================= OWNER ================= */
    o_lateral.owner AS owner,

    /* ================= IMAGES ================= */
    COALESCE(img.images, '[]'::jsonb) AS images,

    /* ============ WEEKLY SCHEDULES ============ */
    COALESCE(ws.weekly_schedules, '[]'::jsonb) AS weekly_schedules,

    /* =============== EXCEPTIONS =============== */
    COALESCE(se.exceptions, '[]'::jsonb) AS exceptions,

    /* ================ SERVICES ================ */
    COALESCE(svc.services, ARRAY[]::uuid[]) AS services,

    /* =============== CATEGORIES =============== */
    COALESCE(cat.categories, '[]'::jsonb) AS categories,

    /* ================ PACKAGES ================ */
    COALESCE(pkg.packages, ARRAY[]::uuid[]) AS packages

  FROM studios s

  /* ================= OWNER ================= */
  LEFT JOIN LATERAL (
    SELECT o.id AS owner
    FROM owners o
    WHERE o.studio_id = s.id
  ) o_lateral ON TRUE

  /* ================= IMAGES ================= */
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', si.id,
        'key', si.key,
        'display_order', si.display_order
      )
      ORDER BY si.display_order
    ) AS images
    FROM studio_images si
    WHERE si.studio_id = s.id
  ) img ON TRUE

  /* ================= WEEKLY SCHEDULES ================= */
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ws.id,
        'effective_from', ws.effective_from,
        'effective_to', ws.effective_to,
        'days', COALESCE(days.days, '[]'::jsonb)
      )
    ) AS weekly_schedules
    FROM weekly_schedules ws
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'day_of_week', ds.day_of_week,
          'is_closed', ds.is_closed,
          'intervals', COALESCE(intervals.intervals, '[]'::jsonb)
        )
      ) AS days
      FROM day_schedules ds
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'start_time', to_char(ti.start_time, 'HH24:MI'),
            'end_time', to_char(ti.end_time, 'HH24:MI')
          )
        ) AS intervals
        FROM time_intervals ti
        WHERE ti.day_schedule_id = ds.id
      ) intervals ON TRUE
      WHERE ds.weekly_schedule_id = ws.id
    ) days ON TRUE
    WHERE ws.studio_id = s.id
  ) ws ON TRUE

  /* ================= EXCEPTIONS ================= */
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'label', e.label,
        'is_closed', e.is_closed,
        'applies_to', COALESCE(dr.date_rules, '[]'::jsonb),
        'intervals', COALESCE(intervals.intervals, '[]'::jsonb)
      )
    ) AS exceptions
    FROM schedule_exceptions e
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type',       edr.type,
          'date',       to_char(edr.date, 'YYYY-MM-DD'),
          'start_date', to_char(edr.start_date, 'YYYY-MM-DD'),
          'end_date',   to_char(edr.end_date, 'YYYY-MM-DD'),
          'month',      edr.month,
          'day',        edr.day
        )
      ) AS date_rules
      FROM exception_date_rules edr
      WHERE edr.exception_id = e.id
    ) dr ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'start_time', to_char(ti.start_time, 'HH24:MI'),
          'end_time',   to_char(ti.end_time, 'HH24:MI')
        )
      ) AS intervals
      FROM time_intervals ti
      WHERE ti.exception_id = e.id
    ) intervals ON TRUE
    WHERE e.studio_id = s.id
  ) se ON TRUE

  /* ================= SERVICES ================= */
  LEFT JOIN LATERAL (
    SELECT array_agg(ss.id) AS services
    FROM studio_services ss
    WHERE ss.studio_id = s.id
    AND ss.deleted_at IS NULL
  ) svc ON TRUE

  /* ================= CATEGORIES ================= */
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', sc.id,
        'name', sc.name,
        'services', COALESCE(cs.services, ARRAY[]::uuid[])
      )
      ORDER BY sc.display_order
    ) AS categories
    FROM studio_categories sc
    LEFT JOIN LATERAL (
      SELECT array_agg(cs.service_id) AS services
      FROM category_services cs
      WHERE cs.category_id = sc.id
    ) cs ON TRUE
    WHERE sc.studio_id = s.id
  ) cat ON TRUE

  /* ================= PACKAGES ================= */
  LEFT JOIN LATERAL (
    SELECT array_agg(sp.id) AS packages
    FROM studio_packages sp
    WHERE sp.studio_id = s.id
    AND sp.deleted_at IS NULL
  ) pkg ON TRUE
`;

export const getStudioByLink = async (link: string): Promise<Studio | null> => {
  const query = `
    ${baseSelect}
    WHERE s.link = $1
    AND s.published IS TRUE
    AND s.deleted_at IS NULL
  `;

  const { rows } = await getPool().query<StudioDB>(query, [link]);

  if(rows.length === 0) return null;

  return mapStudio(rows[0]!);
};

export const getStudioById = async (id: string): Promise<Studio | null> => {
  const query = `
    ${baseSelect}
    WHERE s.id = $1
    AND s.deleted_at IS NULL
  `;

  const { rows } = await getPool().query<StudioDB>(query, [id]);

  if (rows.length === 0) return null;

  return mapStudio(rows[0]!);
};

export const getStudioByOwners = async (ids: string[]): Promise<Studio[]> => {
  const query = `
    ${baseSelect}
    INNER JOIN owners o ON o.studio_id = s.id
    WHERE o.id = ANY($1)
    AND s.deleted_at IS NULL
  `;

  const { rows } = await getPool().query<StudioDB>(query, [ids]);

  return rows.map(mapStudio);
} 

export const getStudiosByIds = async (ids: string[]): Promise<Studio[]> => {
  if (ids.length === 0) return [];

  const query = `
    ${baseSelect}
    WHERE s.id = ANY($1)
    AND s.published IS TRUE
    AND s.visible IS TRUE
    AND s.deleted_at IS NULL
  `;

  const { rows } = await getPool().query<StudioDB>(query, [ids]);

  return rows.map(mapStudio);
};

export const getStudiosByOptions = async (
  options: StudioOptions
): Promise<Studio[]> => {
  const values: any[] = [];
  
  // Helper to keep parameter indexing ($1, $2...) perfectly synced
  const addParam = (val: any) => {
    values.push(val);
    return `$${values.length}`;
  };

  const searchFilters: string[] = [];

  // 1. Build Search/Type Filters
  if (options.search) {
    const sIdx = addParam(`%${options.search}%`);
    searchFilters.push(`(
      s.name ILIKE ${sIdx} 
      OR s.city ILIKE ${sIdx} 
      OR s.country ILIKE ${sIdx} 
      OR s.street ILIKE ${sIdx} 
      OR s.search_tags::text ILIKE ${sIdx}
    )`);
  }

  if (options.studioType) {
    searchFilters.push(`s.type::jsonb @> ${addParam(JSON.stringify([options.studioType]))}::jsonb`);
  }

  searchFilters.push('(s.published IS TRUE AND s.visible IS TRUE)');

  // 2. The Logic: (Match Filters OR Match Force-Include)
  // If no search is provided, we default to TRUE so it doesn't filter out everything
  let matchClause = searchFilters.length > 0 ? `(${searchFilters.join(" AND ")})` : "TRUE";

  if (options.include?.length) {
    // If include is provided, a studio stays if it matches search OR it's in the include list
    matchClause = `(${matchClause} OR s.id = ANY(${addParam(options.include)}::uuid[]))`;
  }

  // 3. Global Hard Rules: Exclude always wins, and Deleted is never allowed
  const globalRules: string[] = ["s.deleted_at IS NULL"];

  if (options.exclude?.length) {
    globalRules.push(`NOT (s.id = ANY(${addParam(options.exclude)}::uuid[]))`);
  }

  const finalWhere = `WHERE ${matchClause} AND ${globalRules.join(" AND ")}`;

  const limitClause = options.amount && options.amount > 0 
    ? `LIMIT ${Number(options.amount)}` 
    : "";

  // One clean query - No UNION, No DISTINCT wrapper needed
  const query = `
    ${baseSelect}
    ${finalWhere}
    ORDER BY s.created_at DESC
    ${limitClause}
  `;

  const { rows } = await getPool().query<StudioDB>(query, values);
  return rows.map(mapStudio);
};