CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "skins" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "price" integer DEFAULT 0 NOT NULL,
  "model_identifier" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "maps" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "thumbnail" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "player_profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "selected_skin" text DEFAULT 'corredor-classico' NOT NULL REFERENCES "skins"("id"),
  "selected_map" text DEFAULT 'cidade-neon' NOT NULL REFERENCES "maps"("id"),
  "coins" integer DEFAULT 0 NOT NULL,
  "best_time" integer DEFAULT 0 NOT NULL,
  "total_runs" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "player_skins" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "skin_id" text NOT NULL REFERENCES "skins"("id") ON DELETE cascade,
  "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "records" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "map_id" text NOT NULL REFERENCES "maps"("id"),
  "skin_id" text NOT NULL REFERENCES "skins"("id"),
  "survival_time" integer NOT NULL,
  "end_reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique_idx" ON "users" ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique_idx" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "player_profiles_user_id_unique_idx" ON "player_profiles" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "player_skins_user_skin_unique_idx" ON "player_skins" ("user_id", "skin_id");
CREATE INDEX IF NOT EXISTS "player_skins_user_idx" ON "player_skins" ("user_id");
CREATE INDEX IF NOT EXISTS "records_survival_time_idx" ON "records" ("survival_time" DESC);
CREATE INDEX IF NOT EXISTS "records_user_id_idx" ON "records" ("user_id");
CREATE INDEX IF NOT EXISTS "records_map_id_idx" ON "records" ("map_id");
