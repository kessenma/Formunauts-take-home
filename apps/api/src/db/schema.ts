import {
  pgTable, pgEnum, serial, integer, text, numeric, boolean, timestamp, index, primaryKey, json,
} from 'drizzle-orm/pg-core';

// ─── Auth Tables (better-auth managed) ───────────────────────────────────────

export const authUsers = pgTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authAccounts = pgTable('auth_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authVerifications = pgTable('auth_verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orgTypeEnum = pgEnum('org_type', ['npo', 'fundraising_agency']);

export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);

export const channelEnum = pgEnum('channel', [
  'street', 'door_to_door', 'event', 'phone', 'email', 'social_media',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'sepa_direct_debit', 'credit_card', 'google_pay', 'apple_pay', 'paypal', 'bank_transfer', 'cash',
]);

// ─── Tables (in FK dependency order) ─────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: orgTypeEnum('type').notNull(),
  country: text('country'),
  website: text('website'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appUsers = pgTable('app_users', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description'),
  goal: numeric('goal', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EUR'),
  status: campaignStatusEnum('status').notNull().default('active'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fundraisers = pgTable('fundraisers', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaignFundraisers = pgTable(
  'campaign_fundraisers',
  {
    campaignId: integer('campaign_id').notNull().references(() => campaigns.id),
    fundraiserId: integer('fundraiser_id').notNull().references(() => fundraisers.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.campaignId, table.fundraiserId] })],
);

export const donors = pgTable('donors', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  country: text('country'),
  postalCode: text('postal_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const donationLocations = pgTable('donation_locations', {
  id: serial('id').primaryKey(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  latitude: numeric('latitude', { precision: 9, scale: 6 }),
  longitude: numeric('longitude', { precision: 9, scale: 6 }),
});

export const spikes = pgTable(
  'spikes',
  {
    id: serial('id').primaryKey(),
    service: text('service').notNull(),   // 'server' | 'database' | 'llm'
    metric: text('metric').notNull(),     // 'response_time' | 'memory_rss' | 'status' | 'connection'
    value: numeric('value', { precision: 12, scale: 2 }),
    threshold: numeric('threshold', { precision: 12, scale: 2 }),
    severity: text('severity').notNull(), // 'warning' | 'critical'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_spikes_created_at').on(table.createdAt),
    index('idx_spikes_service').on(table.service),
  ],
);

export const donations = pgTable(
  'donations',
  {
    id: serial('id').primaryKey(),
    campaignId: integer('campaign_id').notNull().references(() => campaigns.id),
    donorId: integer('donor_id').notNull().references(() => donors.id),
    fundraiserId: integer('fundraiser_id').references(() => fundraisers.id),
    locationId: integer('location_id').references(() => donationLocations.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('EUR'),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    channel: channelEnum('channel').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
    isRecurring: boolean('is_recurring').notNull().default(false),
    ipAddress: text('ip_address'),
    donorFeedbackRating: integer('donor_feedback_rating'),
    isMock: boolean('is_mock').notNull().default(false),
  },
  (table) => [
    index('idx_donations_campaign_date').on(table.campaignId, table.date),
    index('idx_donations_campaign_amount').on(table.campaignId, table.amount),
    index('idx_donations_donor').on(table.donorId),
    index('idx_donations_fundraiser').on(table.fundraiserId),
    index('idx_donations_channel').on(table.channel),
    index('idx_donations_mock').on(table.isMock),
  ],
);

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New conversation'),
    shareToken: text('share_token').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_sessions_user').on(table.userId, table.createdAt),
    index('idx_chat_sessions_share_token').on(table.shareToken),
  ],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    text: text('text').notNull(),
    sql: text('sql'),
    results: json('results').$type<Record<string, unknown>[]>(),
    isError: boolean('is_error').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_messages_session').on(table.sessionId, table.createdAt),
  ],
);
