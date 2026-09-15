import type { PoolClient } from "pg";
import { getPool } from "../config/db.js";
import type { Package, PackageDB, PackageDiff } from "../types/packages.js";
import type { Category, CategoryDB, CategoryDiff, Discount, DiscountsDiff } from "../types/studio.js";
import { getOwnerById } from "./owner.service.js";
import { mapPackage } from "./packages.service.js";
import { getStudioById } from "./studio.service.js";
import type { Addon, Service, ServiceDB, ServiceDiff } from "../types/services.js";
import { mapService } from "./services.service.js";
import { deleteImage, uploadImage } from "./img-upload.service.js";


const FIELD_MAP: Record<string, Record<string, string>> = {
  studio: {
    // PROFILE
    name:           'name',
    link:           'link',
    type:           'type',
    searchTags:     'search_tags',
    contactEmail:   'contact_email',
    contactPhone:   'contact_phone',
    instagramLink:  'instagram_link',
    facebookLink:   'facebook_link',
    whatsAppPhone:  'whatsapp_phone',

    // LOCATION
    country: 'country',
    city: 'city',
    street: 'street',
    buildingNumber: 'building_number',
    apartmentNumber: 'apartment_number',
    latitude: 'latitude',
    longitude: 'longitude',
    timeZone: 'time_zone',

    // BOOKING RULES
    emailReminders: 'email_reminders',
    smsReminders: 'sms_reminders',
    visible: 'visible',
    minScheduleAhead: 'min_schedule_ahead',
    maxScheduleAhead: 'max_schedule_ahead',

    // PUBLISH:
    published: 'published',
  },
  owner: {
    firstName:    'first_name',
    lastName:     'last_name',
    email:        'email',
    setupState:   'setup_state',
    status:       'status',
  },
};

const TABLE_MAP: Record<string, string> = {
  studio: 'studios',
  owner:  'owners',
  services: 'studio_services',
  packages: 'studio_packages',
  categories: 'studio_categories',
};

export async function updateResourceById(
  resource: string,
  id: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const table     = TABLE_MAP[resource];
  const fieldMap  = FIELD_MAP[resource];

  if (!table || !fieldMap) {
    throw new Error(`Unsupported resource: ${resource}`);
  }

  const setClauses: string[] = [];
  const values:     unknown[] = [];
  let   paramIndex  = 1;

  for (const [camelKey, columnName] of Object.entries(fieldMap)) {
    if (!(camelKey in payload) || camelKey === 'id') continue;

    setClauses.push(`${columnName} = $${paramIndex++}`);
    values.push(payload[camelKey]);
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  if (table === 'studios') {
    setClauses.push(`updated_at = now()`);
  }

  values.push(id);

  const query = `
    UPDATE ${table}
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
      AND deleted_at IS NULL
  `;

  const pool = getPool();

  const { rowCount } = await pool.query(query, values);

  if (!rowCount) {
    throw new Error(`${resource} with id "${id}" not found`);
  }

  if (resource === 'studio') {

    if(payload.published === true){
      await pool.query(
        `
        UPDATE owners
        SET setup_state = 'COMPLETED'
        WHERE studio_id = $1
        `,
        [id]
      );
    }

    const updated = await getStudioById(id);
    if (!updated) throw new Error(`Studio with id "${id}" not found after update`);
    return updated as unknown as Record<string, unknown>;
  }

  if (resource === 'owner') {
    const updated = await getOwnerById(id);
    if (!updated) throw new Error(`Owner with id "${id}" not found after update`);
    return updated as unknown as Record<string, unknown>;
  }

  throw new Error(`No mapper found for resource: ${resource}`);
}



export async function updateCategoriesForStudio(
  studioId: string,
  diff: CategoryDiff
): Promise<Category[]> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // DELETE
    if (diff.toDelete.length) {
      await client.query(
        `DELETE FROM studio_categories
         WHERE id = ANY($1) AND studio_id = $2`,
        [diff.toDelete, studioId]
      );
    }

    // INSERT
    if (diff.toInsert.length) {
      const insertValues = diff.toInsert
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
        .join(', ');

      const insertParams = diff.toInsert.flatMap(c => [
        studioId,
        c.name,
        c.displayOrder,
      ]);

      await client.query(
        `INSERT INTO studio_categories (studio_id, name, display_order)
         VALUES ${insertValues}`,
        insertParams
      );
    }

    // UPDATE
    if (diff.toUpdate.length) {
      for (const c of diff.toUpdate) {
        await client.query(
          `UPDATE studio_categories
           SET name = $1, display_order = $2, updated_at = now()
           WHERE id = $3 AND studio_id = $4`,
          [c.name, c.displayOrder, c.id, studioId]
        );
      }
    }

    await client.query('COMMIT');

    const { rows } = await client.query<CategoryDB>(
      `SELECT
        c.*,
        COALESCE(
          json_agg(DISTINCT cs.service_id)
          FILTER (WHERE cs.service_id IS NOT NULL),
          '[]'
        ) AS services
      FROM studio_categories c
      LEFT JOIN category_services cs ON cs.category_id = c.id
      WHERE c.studio_id = $1
      GROUP BY c.id
      ORDER BY c.display_order ASC`,
      [studioId]
    );

    return rows.map(mapCategory);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


const mapCategory = (row: CategoryDB): Category => ({
  id: row.id,
  name: row.name,
  displayOrder: row.display_order,
  studio: row.studio_id,
  services:     row.services ?? [],
});


export async function updatePackagesForStudio(
  studioId: string,
  diff: PackageDiff
): Promise<Package[]> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // SOFT DELETE
    if (diff.toDelete.length) {
      await client.query(
        `UPDATE studio_packages
         SET deleted_at = now()
         WHERE id = ANY($1) AND studio_id = $2`,
        [diff.toDelete, studioId]
      );
    }

    // INSERT
    for (const p of diff.toInsert) {
      const price = Number(p.price.replace(/\./g, "").replace(",", "."));
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO studio_packages
           (studio_id, name, link, price, currency, discount, duration_minutes,
            description, is_reservable, prerequirement_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          studioId,
          p.name,
          p.link,
          price,
          p.currency,
          p.discount,
          p.duration,
          p.description    || null,
          p.isReservable,
          p.prerequirement || null,
        ]
      );

      const packageId = rows[0]!.id;
      await insertAddons(client, packageId, p.addons);
      await insertServiceLinks(client, packageId, p.services);
    }

    // UPDATE
    for (const p of diff.toUpdate) {
      const price = Number(p.price.replace(/\./g, "").replace(",", "."));
      await client.query(
        `UPDATE studio_packages
         SET name = $1, link = $2, price = $3, currency = $4, discount = $5,
             duration_minutes = $6, description = $7, is_reservable = $8,
             prerequirement_id = $9, updated_at = now()
         WHERE id = $10 AND studio_id = $11 AND deleted_at IS NULL`,
        [
          p.name,
          p.link,
          price,
          p.currency,
          p.discount,
          p.duration,
          p.description    || null,
          p.isReservable,
          p.prerequirement || null,
          p.id,
          studioId,
        ]
      );

      await client.query(`DELETE FROM package_addons   WHERE package_id = $1`, [p.id]);
      await client.query(`DELETE FROM service_packages WHERE package_id = $1`, [p.id]);

      await insertAddons(client, p.id, p.addons);
      await insertServiceLinks(client, p.id, p.services);
    }

    await client.query('COMMIT');

    const { rows } = await client.query<PackageDB>(
      `SELECT
         p.*,
         COALESCE(
           json_agg(
             DISTINCT jsonb_build_object(
               'id',                     pa.id,
               'name',                   pa.name,
               'price',                  pa.price,
               'duration_delta_minutes', pa.duration_delta_minutes,
               'group_id',               pa.group_id,
               'is_exclusive',           pa.is_exclusive
             )
           ) FILTER (WHERE pa.id IS NOT NULL),
           '[]'
         ) AS addons,
         COALESCE(
           json_agg(DISTINCT sp.service_id)
           FILTER (WHERE sp.service_id IS NOT NULL),
           '[]'
         ) AS services
       FROM studio_packages p
       LEFT JOIN package_addons   pa ON pa.package_id = p.id
       LEFT JOIN service_packages sp ON sp.package_id = p.id
       WHERE p.studio_id = $1
         AND p.deleted_at IS NULL
       GROUP BY p.id
       ORDER BY p.created_at ASC`,
      [studioId]
    );

    return rows.map(mapPackage);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
// ---- Helpers ----

async function insertAddons(
  client: PoolClient,
  packageId: string,
  addons: Addon[]
): Promise<void> {
  if (!addons.length) return;

  const values = addons
    .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
    .join(', ');

  const params = addons.flatMap(a => [
    packageId,
    a.name,
    a.price ?? '0',
    a.durationDelta ?? null,
    a.group || null,
    a.isExclusive,
  ]);

  await client.query(
    `INSERT INTO package_addons (package_id, name, price, duration_delta_minutes, group_id, is_exclusive)
     VALUES ${values}`,
    params
  );
}

async function insertServiceLinks(
  client: PoolClient,
  packageId: string,
  serviceIds: string[]
): Promise<void> {
  if (!serviceIds.length) return;

  const values = serviceIds
    .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
    .join(', ');

  const params = serviceIds.flatMap(sid => [sid, packageId]);

  await client.query(
    `INSERT INTO service_packages (service_id, package_id)
     VALUES ${values}`,
    params
  );
}
export async function updateServicesForStudio(
  studioId: string,
  diff: ServiceDiff,
  files: Express.Multer.File[]
): Promise<Service[]> {

  // Index files by field name for O(1) lookup
  const fileMap = new Map<string, Express.Multer.File>(
    files.map(f => [f.fieldname, f])
  );

  // ---- Step 1: Upload all new images to R2 before DB transaction ----

  // Resolve thumbnail keys — upload if file present, keep existing key otherwise
  const resolvedThumbnails = new Map<string, string | null>();
  const resolvedGalleries  = new Map<string, { key: string; timestamp: number }[]>();

  const uploadTasks: Promise<void>[] = [];

  for (const s of [...diff.toInsert, ...diff.toUpdate]) {
    uploadTasks.push((async () => {
      // Thumbnail
      const thumbFile = fileMap.get(`thumbnail_${s.localID}`);

      if (thumbFile) {
        try{
          const key = await uploadImage(thumbFile);
          resolvedThumbnails.set(s.localID, key);
        } catch (err) {
          console.error(`[upload] thumbnail_${s.localID} failed:`, err);
          throw err;
        }
      } else {
        resolvedThumbnails.set(s.localID, s.thumbnail.key || null);
      }

      // Gallery
      const resolvedGallery: { key: string; timestamp: number }[] = [];
      for (const img of s.gallery) {
        const galleryFile = fileMap.get(`gallery_${s.localID}_${img.timestamp}`);
        if (galleryFile) {
          try{
            const key = await uploadImage(galleryFile);
            resolvedGallery.push({ key, timestamp: img.timestamp });
          } catch (err) {
            console.error(`[upload] gallery_${s.localID}_${img.timestamp} failed:`, err);
            throw err;
          }
        } else {
          resolvedGallery.push({ key: img.key, timestamp: img.timestamp });
        }
      }
      resolvedGalleries.set(s.localID, resolvedGallery);
    })());
  }

  // Run all uploads in parallel
  const uploadResults = await Promise.allSettled(uploadTasks);

  // If any upload failed, collect newly uploaded keys for cleanup then throw
  const uploadErrors = uploadResults.filter(r => r.status === 'rejected');
  if (uploadErrors.length) {
    uploadErrors.forEach(r => {
      if (r.status === 'rejected') {
        console.error('[updateServicesForStudio] Upload failed:', r.reason);
      }
    });

    const uploadedKeys = [
      ...Array.from(resolvedThumbnails.values()).filter((k): k is string => !!k),
      ...Array.from(resolvedGalleries.values()).flatMap(g => g.map(i => i.key)),
    ];
    await Promise.allSettled(uploadedKeys.map(k => deleteImage(k)));
    throw new Error('One or more image uploads failed');
  }

  // Collect old keys to delete after commit
  const keysToDelete: string[] = [];

  // ---- Step 2: DB transaction ----
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // SOFT DELETE
    if (diff.toDelete.length) {
      await client.query(
        `UPDATE studio_services SET deleted_at = now()
         WHERE id = ANY($1) AND studio_id = $2`,
        [diff.toDelete, studioId]
      );
    }

    // INSERT
    for (const s of diff.toInsert) {
      const price        = Number(s.price.replace(/\./g, '').replace(',', '.'));
      const thumbnailKey = resolvedThumbnails.get(s.localID) ?? null;
      const gallery      = resolvedGalleries.get(s.localID)  ?? [];

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO studio_services
           (studio_id, type, name, link, price, currency, discount,
            duration_minutes, description, thumbnail, is_reservable, prerequirement_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          studioId,
          JSON.stringify(s.type),
          s.name,
          s.link,
          price,
          s.currency,
          s.discount,
          s.duration,
          s.description        || null,
          thumbnailKey,
          s.isReservable,
          s.prerequiredService || null,
        ]
      );

      const serviceId = rows[0]!.id;
      await insertServiceImages(client, serviceId, gallery);
      await insertCategoryLink(client, serviceId, s.category);
    }

    // UPDATE
    for (const s of diff.toUpdate) {
      const price        = Number(s.price.replace(/\./g, '').replace(',', '.'));
      const thumbnailKey = resolvedThumbnails.get(s.localID) ?? null;
      const gallery      = resolvedGalleries.get(s.localID)  ?? [];

      // Fetch old thumbnail and gallery keys for post-commit R2 cleanup
      const { rows: oldRows } = await client.query<{ thumbnail: string | null }>(
        `SELECT thumbnail FROM studio_services WHERE id = $1`,
        [s.id]
      );
      const { rows: oldImageRows } = await client.query<{ key: string }>(
        `SELECT key FROM service_images WHERE service_id = $1`,
        [s.id]
      );

      const oldThumbnailKey = oldRows[0]?.thumbnail ?? null;
      const oldImageKeys    = oldImageRows.map(r => r.key);

      // Only queue old thumbnail for deletion if it changed
      if (oldThumbnailKey && oldThumbnailKey !== thumbnailKey) {
        keysToDelete.push(oldThumbnailKey);
      }

      // Queue old gallery keys no longer in new gallery
      const newKeySet = new Set(gallery.map(g => g.key));
      oldImageKeys.filter(k => !newKeySet.has(k)).forEach(k => keysToDelete.push(k));

      await client.query(
        `UPDATE studio_services
         SET type = $1, name = $2, link = $3, price = $4, currency = $5,
             discount = $6, duration_minutes = $7, description = $8,
             thumbnail = $9, is_reservable = $10, prerequirement_id = $11,
             updated_at = now()
         WHERE id = $12 AND studio_id = $13 AND deleted_at IS NULL`,
        [
          JSON.stringify(s.type),
          s.name,
          s.link,
          price,
          s.currency,
          s.discount,
          s.duration,
          s.description        || null,
          thumbnailKey,
          s.isReservable,
          s.prerequiredService || null,
          s.id,
          studioId,
        ]
      );

      await client.query(`DELETE FROM service_images WHERE service_id = $1`, [s.id]);
      await insertServiceImages(client, s.id, gallery);

      const { rows: existingCategory } = await client.query<{ category_id: string }>(
        `SELECT category_id FROM category_services WHERE service_id = $1`,
        [s.id]
      );
      const currentCategoryId = existingCategory[0]?.category_id ?? null;
      if (currentCategoryId !== s.category) {
        await client.query(`DELETE FROM category_services WHERE service_id = $1`, [s.id]);
        await insertCategoryLink(client, s.id, s.category);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');

    // Clean up newly uploaded R2 objects on DB failure
    const uploadedKeys = [
      ...Array.from(resolvedThumbnails.values()).filter((k): k is string => !!k),
      ...Array.from(resolvedGalleries.values()).flatMap(g => g.map(i => i.key)),
    ];
    await Promise.allSettled(uploadedKeys.map(k => deleteImage(k)));
    throw err;
  } finally {
    client.release();
  }

  // ---- Step 3: Delete obsolete R2 objects after commit ----
  await Promise.allSettled(keysToDelete.map(k => deleteImage(k)));

  // ---- Fetch and return updated services ----
  const { rows } = await getPool().query<ServiceDB>(
    `SELECT
       s.*,
       COALESCE(a.addons,   '[]') AS addons,
       COALESCE(i.images,   '[]') AS gallery,
       COALESCE(p.packages, '[]') AS packages,
       cs.category_id             AS category

     FROM studio_services s

     LEFT JOIN LATERAL (
       SELECT json_agg(jsonb_build_object(
         'id', sa.id, 'name', sa.name, 'price', sa.price,
         'durationDelta', sa.duration_delta_minutes,
         'group', sa.group_id, 'isExclusive', sa.is_exclusive
       )) AS addons
       FROM (SELECT DISTINCT sa.id, sa.name, sa.price,
                    sa.duration_delta_minutes, sa.group_id, sa.is_exclusive
             FROM service_addons sa WHERE sa.service_id = s.id) sa
     ) a ON TRUE

     LEFT JOIN LATERAL (
       SELECT json_agg(jsonb_build_object(
         'id', si.id, 'key', si.key, 'timestamp', EXTRACT(EPOCH FROM si.created_at)
       ) ORDER BY si.display_order) AS images
       FROM (SELECT DISTINCT ON (si.id) si.id, si.key, si.created_at, si.display_order
             FROM service_images si WHERE si.service_id = s.id
             ORDER BY si.id, si.display_order) si
     ) i ON TRUE

     LEFT JOIN LATERAL (
       SELECT json_agg(package_id) AS packages
       FROM (SELECT DISTINCT sp.package_id FROM service_packages sp
             WHERE sp.service_id = s.id) sp
     ) p ON TRUE

     LEFT JOIN category_services cs ON cs.service_id = s.id

     WHERE s.studio_id = $1 AND s.deleted_at IS NULL
     ORDER BY s.created_at ASC`,
    [studioId]
  );

  return rows.map(mapService);
}

// ---- Helpers ----

async function insertServiceImages(
  client: PoolClient,
  serviceId: string,
  gallery: { key: string; timestamp: number }[]
): Promise<void> {
  if (!gallery.length) return;

  const values = gallery
    .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
    .join(', ');

  const params = gallery.flatMap((img, i) => [serviceId, img.key, i]);

  await client.query(
    `INSERT INTO service_images (service_id, key, display_order)
     VALUES ${values}`,
    params
  );
}

async function insertCategoryLink(
  client: PoolClient,
  serviceId: string,
  categoryId: string
): Promise<void> {
  if (!categoryId) return;

  await client.query(
    `INSERT INTO category_services (category_id, service_id)
     VALUES ($1, $2)`,
    [categoryId, serviceId]
  );
}


export async function updateDiscountsForStudio(
  studioId: string,
  diff: DiscountsDiff
): Promise<Discount[]> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // DELETE — reset discount to 0
    for (const id of diff.toDelete) {
      // Try both tables since we don't know the type from id alone
      await client.query(
        `UPDATE studio_services SET discount = 0 WHERE id = $1 AND studio_id = $2`,
        [id, studioId]
      );
      await client.query(
        `UPDATE studio_packages SET discount = 0 WHERE id = $1 AND studio_id = $2`,
        [id, studioId]
      );
    }

    // INSERT + UPDATE — same operation: set discount on the correct table
    const toApply = [...diff.toInsert, ...diff.toUpdate];

    for (const d of toApply) {
      const table =
        d.article.type === 'service' ? 'studio_services' : 'studio_packages';

      await client.query(
        `UPDATE ${table}
         SET discount = $1, updated_at = now()
         WHERE id = $2 AND studio_id = $3`,
        [d.percentage ?? 0, d.article.id, studioId]
      );
    }

    await client.query('COMMIT');

    // Return current discount state for all non-deleted, non-zero discounts
    const { rows: serviceRows } = await client.query<{ id: string; discount: number }>(
      `SELECT id, discount FROM studio_services
       WHERE studio_id = $1 AND deleted_at IS NULL AND discount > 0`,
      [studioId]
    );

    const { rows: packageRows } = await client.query<{ id: string; discount: number }>(
      `SELECT id, discount FROM studio_packages
       WHERE studio_id = $1 AND deleted_at IS NULL AND discount > 0`,
      [studioId]
    );

    const discounts: Discount[] = [
      ...serviceRows.map(r => ({
        localID:    '',
        id:         r.id,
        article:    { id: r.id, type: 'service' as const },
        percentage: r.discount,
        studio:     studioId,
      })),
      ...packageRows.map(r => ({
        localID:    '',
        id:         r.id,
        article:    { id: r.id, type: 'package' as const },
        percentage: r.discount,
        studio:     studioId,
      })),
    ];

    return discounts;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}