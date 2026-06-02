import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Pin SSL behavior explicitly so the connection does not depend on the driver
// interpreting `sslmode` from the connection string. Newer node-postgres
// versions emit a deprecation warning that `sslmode=require` is treated as
// `verify-full`; pinning `ssl` here keeps a future driver upgrade from breaking
// connections to managed Postgres (whose certs are not in the local CA bundle).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
