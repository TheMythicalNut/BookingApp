import { getPool } from "../config/db.js";
import { redis } from "../config/redis.js";
import { reservationConfirmationEmail } from "../config/RESERVATION_OVERVIEW_TEMPLATE.js";
import { formatEuropeanPrice } from "../config/util.js";
import type { LoadReservationOptions, Reservation, ReservationAddonDB, ReservationDB } from "../types/reservation.js";
import { sendMail } from "./email.service.js";


const mapReservation = (row: ReservationDB): Reservation => ({
  id: row.id,

  // Snapshot display fields (joined)
  studioName:   row.studio_name,
  categoryName: row.category_name ?? '',
  articleName:  row.article_name,
  articleType:  typeof row.article_type === 'string'
    ? JSON.parse(row.article_type)
    : (row.article_type ?? []),
  userEmail:    row.user_email,
  userPhone:    row.user_phone,

  // Snapshot fields
  price:          formatEuropeanPrice(row.price),
  currency:       row.currency,
  discount:       row.discount,
  duration:       row.duration_minutes,
  contactPhone:   row.contact_phone,
  additionalNote: row.additional_note ?? '',

  timeslot: {
    date:  row.reservation_date,
    start: row.start_time,
    ...(row.end_time != null && { end: row.end_time }),
  },

  // Location snapshot
  country:   row.country,
  city:      row.city,
  address:   row.address,
  latitude:  row.latitude,
  longitude: row.longitude,
  timeZone:  row.time_zone,

  // Lifecycle
  status: {
    status:  row.status,
    ...(row.status_comment != null && { comment: row.status_comment }),
  },
  termChangeCount: row.term_change_count,
  timestamp:       row.created_at instanceof Date
    ? row.created_at.toISOString()
    : row.created_at,

  // Relations
  user:    row.user_id,
  studio:  row.studio_id,
  service: row.service_id,
  package: row.package_id,

  
  // Addons
  addons: (row.addons ?? []).map((a: ReservationAddonDB) => ({
    id:            a.id,
    name:          a.name,
    price:         formatEuropeanPrice(a.price),
    durationDelta: a.duration_delta_minutes,
    group:         a.group_id ?? '',
    isExclusive:   a.is_exclusive,
  })),

  // Rating
  ...(row.rating != null && row.rating.rating != null && {
    rating: {
        rating:  row.rating.rating,
       ...(row.rating.comment != null && { comment: row.rating.comment }),
    }
  })
});

const SELECT_FIELDS = `
  r.id,
  r.user_id,
  r.studio_id,
  r.service_id,
  r.package_id,

  r.price,
  r.currency,
  r.discount,
  r.duration_minutes,

  r.contact_phone,
  r.additional_note,

  r.country,
  r.city,
  r.address,
  r.latitude,
  r.longitude,
  r.time_zone,

  r.status,
  r.status_comment,
  r.term_change_count,

  r.created_at,
  r.updated_at,

  to_char(rt.reservation_date, 'YYYY-MM-DD') AS reservation_date,
  to_char(rt.start_time, 'HH24:MI')          AS start_time,
  to_char(rt.end_time,   'HH24:MI')           AS end_time,

  s.name                              AS studio_name,
  sc.name                             AS category_name,
  COALESCE(ss.name, sp.name)          AS article_name,
  COALESCE(ss.type::jsonb, '[]'::jsonb) AS article_type,

  u.email AS user_email,
  u.phone AS user_phone,

  COALESCE(addons.addons, '[]'::jsonb) AS addons,

  CASE
    WHEN rating.rating IS NOT NULL THEN
      jsonb_build_object(
        'rating',  rating.rating,
        'comment', rating.comment
      )
    ELSE NULL
  END AS rating
`;

const FROM_JOINS = `
  FROM reservations r

  JOIN reservation_timeslots rt ON rt.reservation_id = r.id
  JOIN studios s                ON s.id = r.studio_id

  LEFT JOIN studio_services   ss      ON ss.id = r.service_id
  LEFT JOIN studio_packages   sp      ON sp.id = r.package_id
  LEFT JOIN category_services cs_link ON cs_link.service_id = ss.id
  LEFT JOIN studio_categories sc      ON sc.id = cs_link.category_id
  LEFT JOIN users             u       ON u.id  = r.user_id

  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',                     sa.id,
        'name',                   sa.name,
        'price',                  sa.price,
        'duration_delta_minutes', sa.duration_delta_minutes,
        'group_id',               sa.group_id,
        'is_exclusive',           sa.is_exclusive
      )
    ) AS addons
    FROM reservation_addons ra
    JOIN service_addons sa ON sa.id = ra.addon_id
    WHERE ra.reservation_id = r.id
  ) addons ON TRUE

  LEFT JOIN LATERAL (
    SELECT rr.rating, rr.comment
    FROM reservation_ratings rr
    WHERE rr.reservation_id = r.id
    LIMIT 1
  ) rating ON TRUE
`;

export const getUserReservationById = async (
  resId: string
): Promise<Reservation> => {
  const query = `SELECT ${SELECT_FIELDS} ${FROM_JOINS} WHERE r.id = $1 LIMIT 1`;

  const { rows } = await getPool().query<ReservationDB>(query, [resId]);

  if (!rows.length || rows[0] == undefined) {
    throw new Error(`Reservation ${resId} not found`);
  }

  return mapReservation(rows[0]);
};

export const getStudioReservationsById = async (
  studioId: string
): Promise<Reservation[]> => {
  const query = `SELECT ${SELECT_FIELDS} ${FROM_JOINS} WHERE r.studio_id = $1`;

  const { rows } = await getPool().query<ReservationDB>(query, [studioId]);

  return rows.map(mapReservation);
};

export const getReservationsByIds = async (
  ids: string[]
): Promise<Reservation[]> => {
  if (!ids.length) return [];

  const query = `SELECT ${SELECT_FIELDS} ${FROM_JOINS} WHERE r.id = ANY($1::uuid[])`;

  const { rows } = await getPool().query<ReservationDB>(query, [ids]);

  return rows.map(mapReservation);
};

export const getReservationsByOptions = async (
  options: LoadReservationOptions
): Promise<Reservation[]> => {
  const conditions: string[] = [];
  const params:     unknown[] = [];
  let   idx = 1;

  // Filter by studio
  if (options.studio) {
    conditions.push(`r.studio_id = $${idx++}`);
    params.push(options.studio);
  }

  if (options.status && options.status.length) {
    const placeholders = options.status.map(() => `$${idx++}`).join(', ');
    conditions.push(`r.status = ANY(ARRAY[${placeholders}]::reservation_status[])`);
    params.push(...options.status);
  }

  // Filter by service
  if (options.service) {
    conditions.push(`r.service_id = $${idx++}`);
    params.push(options.service);
  }

  // Filter by package
  if (options.package) {
    conditions.push(`r.package_id = $${idx++}`);
    params.push(options.package);
  }

  // Filter by article type — ss.type is a jsonb array of type-id strings
  if (options.articleType?.length) {
    conditions.push(`ss.type::jsonb ?| $${idx++}::text[]`);
    params.push(options.articleType);
  }

  // Filter by reservation id
  if (options.reservation) {
    conditions.push(`r.id = $${idx++}`);
    params.push(options.reservation);
  }

  // Filter by timeslot date range (rt.reservation_date)
  if (options.timeslot) {
    conditions.push(`rt.reservation_date >= $${idx++}::date`);
    params.push(options.timeslot.startDate);
    conditions.push(`rt.reservation_date <= $${idx++}::date`);
    params.push(options.timeslot.endDate);
  }

  // Filter by when the reservation was created (r.created_at)
  if(options.reservationTime){
    conditions.push(`r.created_at >= $${idx++}`);
    params.push(options.reservationTime.startDate);
    conditions.push(`r.created_at <= $${idx++}`);
    params.push(options.reservationTime.endDate);
  }

  // Filter by location (exact city + country match)
  if (options.location) {
    const { city, country } = options.location;
    conditions.push(`r.city = $${idx++}`);
    params.push(city);
    conditions.push(`r.country = $${idx++}`);
    params.push(country);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const query = `
    SELECT ${SELECT_FIELDS} ${FROM_JOINS}
    ${where}
    ORDER BY rt.reservation_date DESC, rt.start_time DESC
  `;

  const { rows } = await getPool().query<ReservationDB>(query, params);

  return rows.map(mapReservation);
};
// ─── Create ──────────────────────────────────────────────────────────────────

export type CreateReservationInput = Omit<Reservation, "id">;
export const RESERVATION_CONFIRMATION_WINDOW_MINUTES = 15;

export const createReservation = async (
  input: CreateReservationInput
): Promise<Reservation> => {
  const pool   = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Resolve user: match by email, update phone if changed, or create ──
    const { rows: userRows } = await client.query<{ id: string }>(
      `INSERT INTO users (email, phone)
       VALUES ($1, $2)
       ON CONFLICT (email, phone) DO UPDATE
         SET updated_at = NOW()
       RETURNING id`,
      [input.userEmail, input.userPhone]
    );

    const userId = userRows[0]?.id;
    if (!userId) throw new Error("Failed to resolve user");

    // ── Check user is not banned ───────────────────────────────────────────
    const { rows: banRows } = await client.query<{ banned: boolean }>(
      `SELECT banned FROM users WHERE id = $1`,
      [userId]
    );
    if (banRows[0]?.banned) throw Object.assign(new Error("User is banned"), { status: 403 });

    const expiresAt = new Date(Date.now() + RESERVATION_CONFIRMATION_WINDOW_MINUTES * 60 * 1000);

    const { rows: resRows } = await client.query<{ id: string }>(
      `INSERT INTO reservations (
        user_id, studio_id, service_id, package_id,
        price, currency, discount, duration_minutes,
        contact_phone, additional_note,
        country, city, address, latitude, longitude, time_zone,
        status, status_comment, term_change_count, confirmation_expires_at
      ) VALUES (
        $1,  $2,  $3,  $4,
        $5,  $6,  $7,  $8,
        $9,  $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20
      ) RETURNING id`,
      [
        userId,
        input.studio,
        input.service || null,
        input.package || null,

        
        Number(input.price.replace(/\./g, '').replace(',', '.')),
        input.currency,
        input.discount,
        input.duration,

        input.contactPhone,
        input.additionalNote || null,

        input.country,
        input.city,
        input.address,
        input.latitude,
        input.longitude,
        input.timeZone,

        input.status.status,
        input.status.comment ?? null,
        0,

        expiresAt

      ]
    );

    const reservationId = resRows[0]?.id;
    if (!reservationId) throw new Error("Failed to create reservation: no id returned");

    await client.query(
      `INSERT INTO reservation_timeslots (reservation_id, reservation_date, start_time, end_time)
       VALUES ($1, $2::date, $3::time, $4::time)`,
      [
        reservationId,
        input.timeslot.date,
        input.timeslot.start,
        input.timeslot.end ?? null,
      ]
    );

    if (input.addons?.length) {
      const addonValues = input.addons
        .map((_, i) => `($1, $${i + 2})`)
        .join(", ");
      await client.query(
        `INSERT INTO reservation_addons (reservation_id, addon_id) VALUES ${addonValues}`,
        [reservationId, ...input.addons.map((a) => a.id)]
      );
    }

    await client.query("COMMIT");

    await redis.incr(`studio:${input.studio}:availability:version`);

    const created = await getUserReservationById(reservationId);

    try {
      const { subject, html } = reservationConfirmationEmail(created, created.id);
      await sendMail({ to: input.userEmail, subject, html });
    } catch (mailErr) {
      console.error("Failed to send reservation confirmation email:", mailErr);
    }

    return created;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── Update ──────────────────────────────────────────────────────────────────
export type UpdateReservationInput = Partial<Reservation> & { id: string };

export const updateReservation = async (
  input: UpdateReservationInput
): Promise<Reservation> => {
  const pool   = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const setClauses: string[] = [];
    const params:     unknown[] = [];
    let   idx = 1;

    const addField = (col: string, value: unknown) => {
      setClauses.push(`${col} = $${idx++}`);
      params.push(value);
    };

    if (input.status !== undefined) {
      setClauses.push(`status = $${idx++}::reservation_status`);
      params.push(input.status.status);
      addField("status_comment", input.status.comment ?? null);
    }
    if (input.contactPhone !== undefined) addField("contact_phone", input.contactPhone);
    if (input.additionalNote !== undefined) addField("additional_note", input.additionalNote);
    if (input.price !== undefined) addField("price", input.price);
    if (input.currency !== undefined) addField("currency", input.currency);
    if (input.discount !== undefined) addField("discount", input.discount);
    if (input.duration !== undefined) addField("duration_minutes", input.duration);
    if (input.termChangeCount !== undefined) addField("term_change_count", input.termChangeCount);

    if (setClauses.length) {
      params.push(input.id);
      await client.query(
        `UPDATE reservations SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
        params
      );
    }

    if (input.timeslot) {
      await client.query(
        `UPDATE reservation_timeslots
         SET reservation_date = $1::date,
             start_time       = $2::time,
             end_time         = $3::time
         WHERE reservation_id = $4`,
        [
          input.timeslot.date,
          input.timeslot.start,
          input.timeslot.end ?? null,
          input.id,
        ]
      );
    }

    if (input.rating !== undefined) {
      await client.query(
        `INSERT INTO reservation_ratings (reservation_id, rating, comment, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (reservation_id)
         DO UPDATE SET
           rating     = EXCLUDED.rating,
           comment    = EXCLUDED.comment,
           updated_at = NOW()`,
        [
          input.id,
          input.rating.rating,
          input.rating.comment ?? null,
        ]
      );
    }

    await client.query("COMMIT");

    await redis.incr(`studio:${input.studio}:availability:version`);
    
    return getUserReservationById(input.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const resendEmailById = async (id: string): Promise<void> => {
  const reservation = await getUserReservationById(id);

  const { subject, html } = reservationConfirmationEmail(reservation, id);

  await sendMail({ to: reservation.userEmail, subject, html });
};

export const expireUnconfirmedReservations = async (): Promise<number> => {
  const query = `
    UPDATE reservations
    SET status = 'CONFIRMATION_EXPIRED'
    WHERE status = 'PENDING_CONFIRMATION'
      AND confirmation_expires_at < NOW()
    RETURNING id
  `;

  const result = await getPool().query(query);
  return result.rowCount ?? 0;
};