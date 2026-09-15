import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import type { Request, Response, NextFunction } from "express";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const parsedMaxSize = parseInt(process.env.MAX_FILE_SIZE ?? "");
if (process.env.MAX_FILE_SIZE !== undefined && Number.isNaN(parsedMaxSize)) {
  throw new Error( `MAX_FILE_SIZE env var is set to an invalid value: "${process.env.MAX_FILE_SIZE}". Expected a number in bytes.`);
}
const FILE_SIZE_LIMIT = Number.isNaN(parsedMaxSize)
  ? 5 * 1024 * 1024 // 5 MB default
  : parsedMaxSize;

function makeClientError(message: string): Error {
  const err = new Error(message) as Error & {
    status: number;
    isOperational: boolean;
  };
  err.status = 400;
  err.isOperational = true;
  return err;
}

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
    return cb(makeClientError("Invalid file type"));

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMIT,
    files: 10,
  },
});

export async function validateFileBytes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const files: Express.Multer.File[] = req.file
    ? [req.file]
    : (req.files as Express.Multer.File[]) ?? [];
 
  for (const file of files) {
    const slice = file.buffer.subarray(0, 4100);
    const detected = await fileTypeFromBuffer(slice);
 
    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
      res.status(400).json({
        status: "error",
        error: `File "${file.originalname}" is not a valid image. Only JPEG, PNG, and WebP are accepted.`,
      });
      return;
    }
 
    file.mimetype = detected.mime;
  }
 
  next();
}