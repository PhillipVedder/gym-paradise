import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const gymStates = sqliteTable('gym_states', {
  ownerId: text('owner_id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('idx_media_owner').on(t.ownerId)],
);
