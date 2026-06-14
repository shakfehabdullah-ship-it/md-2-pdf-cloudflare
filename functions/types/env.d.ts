// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  PDF_BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  RENDER_PDF_URL: string;
}