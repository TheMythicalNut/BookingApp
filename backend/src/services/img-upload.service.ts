import {
  PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput} from "@aws-sdk/client-s3"

import crypto from "crypto";
import { getR2Client } from "../config/r2client.js";

const BUCKET = process.env.R2_BUCKET_NAME;

function generateKey(filename: string): string {
  const id = crypto.randomUUID();
  const ext = filename.split(".").pop();
  return `${id}.${ext}`;
}

export async function uploadImage(file: Express.Multer.File): Promise<string> {
  const key = generateKey(file.originalname);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // TODO: CacheControl: "public, max-age=31536000, immutable"
  });
  await getR2Client().send(command);
  return key;
}

export async function getImage(key: string): Promise<GetObjectCommandOutput> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getR2Client().send(command);
}

export async function deleteImage(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await getR2Client().send(command);
}