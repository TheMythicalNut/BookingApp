import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { updateStudioMedia } from '../services/media.service.js';

const MAX_HERO_IMAGES = 3;

export async function uploadStudioMedia(
req: AuthenticatedRequest,
res: Response,
next: NextFunction
): Promise<void> {
try {
if (!req.user) {
res.status(401).json({ message: 'Unauthorized' });
return;
}

const studioId = req.user.studioId;

// Multer may return either File[] or Record<string, File[]>
if (!req.files || Array.isArray(req.files)) {
  res.status(400).json({ message: 'Invalid multipart file structure' });
  return;
}

const files = req.files as Record<string, Express.Multer.File[]>;

// Parse retained IDs
let retainedImageIds: string[] = [];
try {
  retainedImageIds = JSON.parse(req.body.retainedImageIds ?? '[]');

  if (
    !Array.isArray(retainedImageIds) ||
    !retainedImageIds.every((id) => typeof id === 'string')
  ) {
    throw new Error();
  }
} catch {
  res.status(400).json({ message: 'Invalid retainedImageIds JSON' });
  return;
}

// Validate thumbnail
const thumbnailFiles = files['thumbnail'] ?? [];
if (thumbnailFiles.length > 1) {
  res.status(400).json({ message: 'Only one thumbnail allowed' });
  return;
}

const thumbnailFile = thumbnailFiles[0] ?? null;

// Collect hero files
const heroFiles: { index: number; file: Express.Multer.File }[] = [];

for (let i = 0; i < MAX_HERO_IMAGES; i++) {
  const slot = files[`heroImage_${i}`];

  if (!slot) continue;

  if (slot.length > 1) {
    res.status(400).json({ message: `Only one file allowed for heroImage_${i}` });
    return;
  }

  const file = slot[0];
  if (!file) continue;

  heroFiles.push({
    index: i,
    file,
  });
}

// Ensure no unexpected hero fields
const allowedFields = new Set([
  'thumbnail',
  ...Array.from({ length: MAX_HERO_IMAGES }, (_, i) => `heroImage_${i}`)
]);

for (const field of Object.keys(files)) {
  if (!allowedFields.has(field)) {
    res.status(400).json({ message: `Unexpected field: ${field}` });
    return;
  }
}

if (heroFiles.length + retainedImageIds.length > MAX_HERO_IMAGES) {
  res.status(400).json({
    message: `Maximum ${MAX_HERO_IMAGES} hero images allowed`,
  });
  return;
}

const studio = await updateStudioMedia({
  studioId,
  thumbnailFile,
  heroFiles,
  retainedImageIds,
});

if (!studio) {
  res.status(404).json({ message: 'Studio not found' });
  return;
}

res.status(200).json(studio);

} catch (err) {
next(err);
}
}
