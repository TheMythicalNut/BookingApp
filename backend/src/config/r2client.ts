import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.R2_ENDPOINT) {
  throw new Error("Missing environment variable: R2_ENDPOINT");
}
if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error("Missing environment variable: R2_ACCESS_KEY_ID");
}
if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing environment variable: R2_SECRET_ACCESS_KEY");
}

const R2_REGION = process.env.R2_REGION ?? "eeur";
const R2_ENDPOINT = process.env.R2_ENDPOINT as string;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;

let r2client: S3Client | null = null;

export function getR2Client(): S3Client {
    if(!r2client){
        console.debug({ message: "Creating R2Client", region: R2_REGION, endpoint: R2_ENDPOINT});

        r2client = new S3Client({
            region: R2_REGION,
            endpoint: R2_ENDPOINT,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return r2client;
}