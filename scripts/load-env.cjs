/**
 * Load .env.local then .env; mirror MONGODB_URI → DATABASE_URL for Prisma.
 * Used by db:push and can be required before other CLIs.
 * SRV fallback lives in `mongodb-srv-fallback.cjs` (db:push + tuneMongoDatabaseUrl).
 */
const { resolve } = require("path");
const { config } = require("dotenv");

const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}
