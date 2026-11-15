import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { MAPS } from '../data/maps';
import { SKINS } from '../data/skins';

export type AppDatabase = NeonHttpDatabase<typeof schema>;

interface ConnectionResolution {
  url: string | null;
  envVar: string | null;
}

export function resolveNeonConnectionUrl(): ConnectionResolution {
  const candidates: Array<{ name: string; value: string | undefined }> = [
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { name: 'POSTGRES_URL', value: process.env.POSTGRES_URL },
    { name: 'POSTGRES_PRISMA_URL', value: process.env.POSTGRES_PRISMA_URL },
  ];

  for (const candidate of candidates) {
    const val = candidate.value?.trim();
    if (
      val &&
      !val.includes('USER:PASSWORD@') &&
      (val.startsWith('postgres://') || val.startsWith('postgresql://'))
    ) {
      return { url: val, envVar: candidate.name };
    }
  }

  return { url: null, envVar: null };
}

let cachedDb: AppDatabase | null = null;
let cachedUrl: string | null = null;
let catalogSeeded = false;

export function getDb(): AppDatabase | null {
  const { url } = resolveNeonConnectionUrl();
  if (!url) return null;

  if (!cachedDb || cachedUrl !== url) {
    const client = neon(url);
    cachedDb = drizzle(client, { schema });
    cachedUrl = url;
    catalogSeeded = false;
  }

  return cachedDb;
}

export async function ensureSchemaAndCatalog(db: AppDatabase): Promise<void> {
  if (catalogSeeded) return;

  // Ensure tables exist idempotently (safe on fresh Neon databases before CLI migrate)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "username" text NOT NULL,
      "email" text NOT NULL,
      "password_hash" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "skins" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "price" integer DEFAULT 0 NOT NULL,
      "model_identifier" text NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "maps" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "description" text NOT NULL,
      "thumbnail" text NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "player_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "selected_skin" text DEFAULT 'corredor-classico' NOT NULL REFERENCES "skins"("id"),
      "selected_map" text DEFAULT 'cidade-neon' NOT NULL REFERENCES "maps"("id"),
      "coins" integer DEFAULT 0 NOT NULL,
      "best_time" integer DEFAULT 0 NOT NULL,
      "total_runs" integer DEFAULT 0 NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "player_skins" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "skin_id" text NOT NULL REFERENCES "skins"("id") ON DELETE cascade,
      "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "records" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "map_id" text NOT NULL REFERENCES "maps"("id"),
      "skin_id" text NOT NULL REFERENCES "skins"("id"),
      "survival_time" integer NOT NULL,
      "end_reason" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique_idx" ON "users" ("username")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique_idx" ON "users" ("email")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "player_profiles_user_id_unique_idx" ON "player_profiles" ("user_id")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "player_skins_user_skin_unique_idx" ON "player_skins" ("user_id", "skin_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "records_survival_time_idx" ON "records" ("survival_time" DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "records_user_id_idx" ON "records" ("user_id")`);

  // Idempotently seed the 30 skins (all free) and 30 maps
  for (const skin of SKINS) {
    await db
      .insert(schema.skins)
      .values({
        id: skin.id,
        name: skin.name,
        price: 0,
        modelIdentifier: skin.modelIdentifier,
      })
      .onConflictDoUpdate({
        target: schema.skins.id,
        set: {
          name: skin.name,
          price: 0,
          modelIdentifier: skin.modelIdentifier,
        },
      });
  }

  for (const map of MAPS) {
    await db
      .insert(schema.maps)
      .values({
        id: map.id,
        name: map.name,
        description: map.description,
        thumbnail: `procedural:${map.id}`,
      })
      .onConflictDoNothing();
  }

  catalogSeeded = true;
}

export interface DatabaseHealthStatus {
  configured: boolean;
  connected: boolean;
  envVar: string | null;
  error?: string;
}

export async function checkNeonHealth(): Promise<DatabaseHealthStatus> {
  const { url, envVar } = resolveNeonConnectionUrl();
  if (!url) {
    return {
      configured: false,
      connected: false,
      envVar: null,
      error:
        'Nenhuma variável Neon PostgreSQL configurada (DATABASE_URL, POSTGRES_URL ou POSTGRES_PRISMA_URL).',
    };
  }

  try {
    const db = getDb();
    if (!db) {
      return { configured: false, connected: false, envVar };
    }
    await db.execute(sql`SELECT 1`);
    return { configured: true, connected: true, envVar };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao conectar no Neon PostgreSQL.';
    return {
      configured: true,
      connected: false,
      envVar,
      error: message,
    };
  }
}
