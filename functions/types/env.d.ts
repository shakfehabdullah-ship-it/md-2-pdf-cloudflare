// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  MYBROWSER: Fetcher;
  PDF_BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}