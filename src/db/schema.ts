import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Users ──────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  telegramId: text('telegram_id').notNull().unique(),
  telegramUsername: text('telegram_username'),
  firstName: text('first_name'),
  timezone: text('timezone').default('America/Lima'),
  locale: text('locale').default('es'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').default('(datetime(\'now\'))'),
});

// ─── Languages ──────────────────────────────────────────────────
export const languages = sqliteTable('languages', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
});

// ─── Event Types ────────────────────────────────────────────────
export const eventTypes = sqliteTable('event_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  emoji: text('emoji').default('🎮'),
  description: text('description'),
});

// ─── Event Type Translations ────────────────────────────────────
export const eventTypeTranslations = sqliteTable('event_type_translations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventTypeId: integer('event_type_id').notNull().references(() => eventTypes.id),
  locale: text('locale').notNull().references(() => languages.code),
  name: text('name').notNull(),
  description: text('description'),
});

// ─── Events (scheduled instances) ──────────────────────────────
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventTypeId: integer('event_type_id').notNull().references(() => eventTypes.id),
  eventDate: text('event_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  timezone: text('timezone').default('CET'),
  createdAt: text('created_at').default('(datetime(\'now\'))'),
});

// ─── Subscriptions (N:N users ↔ event_types) ────────────────────
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  eventTypeId: integer('event_type_id').references(() => eventTypes.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default('(datetime(\'now\'))'),
});

// ─── Notification Log (prevents duplicate alerts) ───────────────
export const notificationLog = sqliteTable('notification_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  eventId: integer('event_id').notNull().references(() => events.id),
  alertType: text('alert_type').notNull().default('5min'),
  sentAt: text('sent_at').default('(datetime(\'now\'))'),
});
