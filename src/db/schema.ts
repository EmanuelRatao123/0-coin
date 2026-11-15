import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_username_unique_idx').on(table.username),
    uniqueIndex('users_email_unique_idx').on(table.email),
  ],
);

export const skins = pgTable('skins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: integer('price').notNull().default(0),
  modelIdentifier: text('model_identifier').notNull(),
});

export const maps = pgTable('maps', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  thumbnail: text('thumbnail').notNull(),
});

export const playerProfiles = pgTable(
  'player_profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    selectedSkin: text('selected_skin')
      .notNull()
      .default('corredor-classico')
      .references(() => skins.id),
    selectedMap: text('selected_map')
      .notNull()
      .default('cidade-neon')
      .references(() => maps.id),
    coins: integer('coins').notNull().default(0),
    bestTime: integer('best_time').notNull().default(0), // milliseconds
    totalRuns: integer('total_runs').notNull().default(0),
  },
  (table) => [uniqueIndex('player_profiles_user_id_unique_idx').on(table.userId)],
);

export const playerSkins = pgTable(
  'player_skins',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skinId: text('skin_id')
      .notNull()
      .references(() => skins.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('player_skins_user_skin_unique_idx').on(table.userId, table.skinId),
    index('player_skins_user_idx').on(table.userId),
  ],
);

export const records = pgTable(
  'records',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mapId: text('map_id')
      .notNull()
      .references(() => maps.id),
    skinId: text('skin_id')
      .notNull()
      .references(() => skins.id),
    survivalTime: integer('survival_time').notNull(), // milliseconds
    endReason: text('end_reason').notNull(), // 'coin_collected' | 'obstacle_collision'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('records_survival_time_idx').on(table.survivalTime),
    index('records_user_id_idx').on(table.userId),
    index('records_map_id_idx').on(table.mapId),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(playerProfiles, {
    fields: [users.id],
    references: [playerProfiles.userId],
  }),
  unlockedSkins: many(playerSkins),
  records: many(records),
}));

export const playerProfilesRelations = relations(playerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [playerProfiles.userId],
    references: [users.id],
  }),
  skin: one(skins, {
    fields: [playerProfiles.selectedSkin],
    references: [skins.id],
  }),
  map: one(maps, {
    fields: [playerProfiles.selectedMap],
    references: [maps.id],
  }),
}));

export const playerSkinsRelations = relations(playerSkins, ({ one }) => ({
  user: one(users, {
    fields: [playerSkins.userId],
    references: [users.id],
  }),
  skin: one(skins, {
    fields: [playerSkins.skinId],
    references: [skins.id],
  }),
}));

export const recordsRelations = relations(records, ({ one }) => ({
  user: one(users, {
    fields: [records.userId],
    references: [users.id],
  }),
  map: one(maps, {
    fields: [records.mapId],
    references: [maps.id],
  }),
  skin: one(skins, {
    fields: [records.skinId],
    references: [skins.id],
  }),
}));
