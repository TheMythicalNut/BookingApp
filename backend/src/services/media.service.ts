import { getPool } from '../config/db.js';
import type { Studio } from '../types/studio.js';
import { uploadImage, deleteImage } from './img-upload.service.js';
import { getStudioById } from './studio.service.js';

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
if (!R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is not set');

const MAX_HERO_IMAGES = 3;

export interface StudioMediaInput {
studioId: string;
thumbnailFile: Express.Multer.File | null;
heroFiles: { index: number; file: Express.Multer.File }[];
retainedImageIds: string[];
}

export async function updateStudioMedia(
input: StudioMediaInput
): Promise<Studio | null> {

const { studioId, thumbnailFile, heroFiles, retainedImageIds } = input;
const pool = getPool();

// Fetch current state
const [studioResult, imageResult] = await Promise.all([
pool.query<{ thumbnail: string | null }>(
`SELECT thumbnail FROM studios WHERE id = $1 AND deleted_at IS NULL`,
[studioId]
),
pool.query<{ id: string; key: string; display_order: number }>(
`SELECT id, key, display_order
       FROM studio_images
       WHERE studio_id = $1
       ORDER BY display_order ASC`,
[studioId]
),
]);

if (!studioResult.rows.length) return null;

const currentThumbnailKey = studioResult.rows[0]?.thumbnail ?? null;
const currentImages = imageResult.rows;

const currentImageMap = new Map(currentImages.map(i => [i.id, i]));

const validRetained = retainedImageIds.map(id => {
const img = currentImageMap.get(id);
if (!img) throw new Error('Invalid retained image id supplied');
return img;
});

// ---- Upload new files ----
const [newThumbnailKey, ...heroUploads] = await Promise.all([
thumbnailFile ? uploadImage(thumbnailFile) : Promise.resolve(null),
...heroFiles.map(async ({ index, file }) => {
const key = await uploadImage(file);
return { index, key };
}),
]);

const newHeroEntries = heroUploads as { index: number; key: string }[];

// ---- Build final hero slot array ----
const slots: (string | null)[] = new Array(MAX_HERO_IMAGES).fill(null);

for (const { index, key } of newHeroEntries) {
if (index >= MAX_HERO_IMAGES) continue;
slots[index] = key;
}

const retainedSorted = validRetained;

let retainedIdx = 0;
for (let i = 0; i < MAX_HERO_IMAGES; i++) {
if (slots[i] === null && retainedIdx < retainedSorted.length) {
const retainedImage = retainedSorted[retainedIdx];
if(retainedImage){
  slots[i] = retainedImage.key;
  retainedIdx++;
}
}
}

const finalHeroKeys = slots.filter((k): k is string => k !== null);

// Determine removed keys
const finalKeySet = new Set(finalHeroKeys);
const removedHeroKeys = currentImages
.map(i => i.key)
.filter(k => !finalKeySet.has(k));

// ---- DB Transaction ----
const client = await pool.connect();
let oldThumbnailKey: string | null = null;

try {
await client.query('BEGIN');

if (newThumbnailKey) {
  oldThumbnailKey = currentThumbnailKey;
  await client.query(
    `UPDATE studios
     SET thumbnail = $1, updated_at = now()
     WHERE id = $2`,
    [newThumbnailKey, studioId]
  );
}

await client.query(
  `DELETE FROM studio_images WHERE studio_id = $1`,
  [studioId]
);

if (finalHeroKeys.length) {
  await client.query(
    `INSERT INTO studio_images (studio_id, key, display_order)
     SELECT $1, key, ord - 1
     FROM unnest($2::text[]) WITH ORDINALITY AS t(key, ord)`,
    [studioId, finalHeroKeys]
  );
}

await client.query('COMMIT');

} catch (err) {
await client.query('ROLLBACK');

const cleanup = await Promise.allSettled([
  ...(newThumbnailKey ? [deleteImage(newThumbnailKey)] : []),
  ...newHeroEntries.map(e => deleteImage(e.key)),
]);

cleanup
  .filter(r => r.status === 'rejected')
  .forEach(r => console.error('R2 cleanup failed:', r));

throw err;

} finally {
client.release();
}

// ---- Delete obsolete R2 objects ----
const deletion = await Promise.allSettled([
...(oldThumbnailKey ? [deleteImage(oldThumbnailKey)] : []),
...removedHeroKeys.map(k => deleteImage(k)),
]);

deletion
.filter(r => r.status === 'rejected')
.forEach(r => console.error('R2 deletion failed:', r));

// ---- Fetch updated state ----
return getStudioById(studioId);
}

export function buildUrl(key: string): string {
return `${R2_PUBLIC_URL}/${key}`;
}
