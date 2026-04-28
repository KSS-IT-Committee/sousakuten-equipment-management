import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

declare global {
  // Reuse the pool across HMR reloads in dev to avoid leaking connections.
  var pgClient: ReturnType<typeof postgres> | undefined;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}
const client = global.pgClient ?? postgres(databaseUrl, { max: 10 });
if (process.env.NODE_ENV !== "production") global.pgClient = client;

export const db = drizzle(client, { schema });
