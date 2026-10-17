declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    TEACHER_INITIAL_HASH: string;
    ACCOUNT_RATE_SECRET: string;
    BUCKET?: R2Bucket;
  }
}
