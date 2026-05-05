import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { auth } from './auth';
import { db } from './db/client';
import { redis, redisSub } from './db/redis';
import {
  campaigns, donations, donors, fundraisers, donationLocations, spikes, authVerifications,
  organizations, campaignFundraisers, chatSessions, chatMessages, authUsers,
} from './db/schema';
import { eq, sql, asc, desc, count, and, or, ilike, gte, lte, SQL } from 'drizzle-orm';
import { generateMockDonations, deleteAllMockDonations, generateOneMockDonation } from './db/mock';
import { seed } from './db/seed';
import type {
  WsDonationEvent, MockDataParams, Donation, SortParams,
  PaymentMethod, DonationChannel, AnyPaymentMethod,
  ChatSession, ChatMessage,
} from '@formunauts/shared';

async function initDb() {
  const [existing] = await db.select({ id: donors.id }).from(donors).limit(1);
  if (!existing) {
    console.log('No data found — running seed...');
    await seed();
  }
}

await initDb();

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL ?? 'http://localhost:8082';

function buildEnrichedQuestion(
  question: string,
  context: Array<{ type: string; label: string; id: number | null; value?: string }> | undefined,
): string {
  if (!context?.length) return question;
  const parts = context.map((c) => {
    if (c.id === null && !c.value) return `topic="${c.type}"`;
    if (c.type === 'payment' || c.type === 'channel') return `${c.type}="${c.value ?? c.label}"`;
    if (c.type === 'date') return `date="${c.label}"`;
    return `${c.type}="${c.label}" (id=${c.id})`;
  });
  return `[Context: ${parts.join(', ')}]\n${question}`;
}

function isSqlSafe(rawSql: string): boolean {
  const trimmed = rawSql.trim();
  if (!/^select\b/i.test(trimmed)) return false;
  if (/;/.test(trimmed)) return false;
  if (/\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|execute|exec|copy)\b/i.test(trimmed)) return false;
  return true;
}

const SORT_COLUMN_MAP: Record<SortParams['sort'], typeof donations.date | typeof donations.amount | typeof donors.lastName> = {
  date: donations.date,
  amount: donations.amount,
  donorLastName: donors.lastName,
};

const wsClients = new Set<import('bun').ServerWebSocket<unknown>>();

// ── Spike detection ───────────────────────────────────────────────────────────

async function shouldRecordSpike(key: string, cooldownSecs = 60): Promise<boolean> {
  const result = await redis.set(`spike:${key}`, '1', 'NX', 'EX', String(cooldownSecs));
  return result === 'OK';
}

function normalizePaymentMethod(pm: AnyPaymentMethod): PaymentMethod {
  if (pm === 'card') return 'credit_card';
  if (pm === 'sepa') return 'sepa_direct_debit';
  return pm as PaymentMethod;
}

function broadcastDonation(donation: Donation) {
  const event: WsDonationEvent = { type: 'new_donation', payload: donation };
  const msg = JSON.stringify(event);
  for (const client of wsClients) {
    try { client.send(msg); } catch { wsClients.delete(client); }
  }
}

// ── Shared join + shape helpers ───────────────────────────────────────────────

type JoinedRow = {
  id: number;
  campaignId: number;
  amount: string;
  currency: string;
  paymentMethod: PaymentMethod;
  channel: DonationChannel;
  date: Date;
  isRecurring: boolean;
  isMock: boolean;
  ipAddress: string | null;
  donorFeedbackRating: number | null;
  donorId: number | null;
  donorFirstName: string | null;
  donorLastName: string | null;
  donorEmail: string | null;
  donorPhone: string | null;
  donorCity: string | null;
  donorCountry: string | null;
  fundraiserId: number | null;
  fundraiserFirstName: string | null;
  fundraiserLastName: string | null;
  fundraiserEmail: string | null;
  fundraiserPhone: string | null;
  locationId: number | null;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: string | null;
  locationLng: string | null;
};

const JOINED_COLUMNS = {
  id: donations.id,
  campaignId: donations.campaignId,
  amount: donations.amount,
  currency: donations.currency,
  paymentMethod: donations.paymentMethod,
  channel: donations.channel,
  date: donations.date,
  isRecurring: donations.isRecurring,
  isMock: donations.isMock,
  ipAddress: donations.ipAddress,
  donorFeedbackRating: donations.donorFeedbackRating,
  donorId: donors.id,
  donorFirstName: donors.firstName,
  donorLastName: donors.lastName,
  donorEmail: donors.email,
  donorPhone: donors.phone,
  donorCity: donors.city,
  donorCountry: donors.country,
  fundraiserId: fundraisers.id,
  fundraiserFirstName: fundraisers.firstName,
  fundraiserLastName: fundraisers.lastName,
  fundraiserEmail: fundraisers.email,
  fundraiserPhone: fundraisers.phone,
  locationId: donationLocations.id,
  locationCity: donationLocations.city,
  locationCountry: donationLocations.country,
  locationLat: donationLocations.latitude,
  locationLng: donationLocations.longitude,
};

function donationsBaseQuery(where?: SQL) {
  return db
    .select(JOINED_COLUMNS)
    .from(donations)
    .leftJoin(donors, eq(donations.donorId, donors.id))
    .leftJoin(fundraisers, eq(donations.fundraiserId, fundraisers.id))
    .leftJoin(donationLocations, eq(donations.locationId, donationLocations.id))
    .where(where);
}

function shapeRow(row: JoinedRow): Donation {
  return {
    id: row.id,
    campaignId: row.campaignId,
    donorName: `${row.donorFirstName} ${row.donorLastName}`,
    email: row.donorEmail,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    channel: row.channel,
    createdAt: row.date.toISOString(),
    isRecurring: row.isRecurring,
    isMock: row.isMock,
    ipAddress: row.ipAddress,
    donorFeedbackRating: row.donorFeedbackRating,
    donor: {
      id: row.donorId!,
      firstName: row.donorFirstName!,
      lastName: row.donorLastName!,
      email: row.donorEmail,
      phone: row.donorPhone,
      city: row.donorCity,
      country: row.donorCountry,
    },
    fundraiser: row.fundraiserId ? {
      id: row.fundraiserId,
      firstName: row.fundraiserFirstName!,
      lastName: row.fundraiserLastName!,
      email: row.fundraiserEmail,
      phone: row.fundraiserPhone,
    } : null,
    location: row.locationId ? {
      id: row.locationId,
      city: row.locationCity!,
      country: row.locationCountry!,
      latitude: row.locationLat ? parseFloat(row.locationLat) : null,
      longitude: row.locationLng ? parseFloat(row.locationLng) : null,
    } : null,
  };
}

// ── Donation stream ───────────────────────────────────────────────────────────

interface StreamConfig { campaignId: number; intervalMs: number; minAmount: number; maxAmount: number; }

let streamTimer: ReturnType<typeof setInterval> | null = null;
let streamConfig: StreamConfig | null = null;
let streamCount = 0;
let streamStartedAt: string | null = null;

async function streamTick(): Promise<void> {
  if (!streamConfig) return;
  try {
    const donationId = await generateOneMockDonation(streamConfig.campaignId, streamConfig.minAmount, streamConfig.maxAmount);
    const [shaped] = await donationsBaseQuery(eq(donations.id, donationId));
    if (shaped) {
      const donation = shapeRow(shaped as JoinedRow);
      await redis.publish('donations:live', JSON.stringify(donation));
      streamCount++;
    }
  } catch (err) {
    console.error('[stream] tick error', err);
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .derive(async ({ headers }) => {
    const session = await auth.api.getSession({
      headers: new Headers(headers as Record<string, string>),
    });
    return { session };
  })
  .onBeforeHandle(({ session, set, request }) => {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/api/auth') && !path.startsWith('/api/chat/share/') && !session) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
  })
  // Prototype forgot-password: triggers token generation and returns it directly (no email)
  .post(
    '/api/auth/forgot-password-dev',
    async ({ body, request }) => {
      const origin = new URL(request.url).origin;
      const before = new Date();
      await fetch(`${origin}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: body.email, redirectTo: 'http://localhost:4200/reset-password' }),
      });
      // better-auth stores reset tokens with identifier = 'reset-password:<token>'
      const [row] = await db
        .select({ identifier: authVerifications.identifier })
        .from(authVerifications)
        .where(and(
          ilike(authVerifications.identifier, 'reset-password:%'),
          gte(authVerifications.createdAt, before),
        ))
        .orderBy(desc(authVerifications.expiresAt))
        .limit(1);
      if (!row) return new Response(JSON.stringify({ error: 'No account found for that email' }), { status: 404 });
      const token = row.identifier.replace('reset-password:', '');
      return { token };
    },
    { body: t.Object({ email: t.String() }) },
  )
  .all('/api/auth/*', ({ request }) => auth.handler(request))

  // Campaign with aggregated stats — returns the first active campaign
  .get('/api/campaign', async () => {
    const [row] = await db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        title: campaigns.title,
        description: campaigns.description,
        goal: campaigns.goal,
        currency: campaigns.currency,
        status: campaigns.status,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        raised: sql<string>`coalesce(sum(${donations.amount}), 0)`,
        donorCount: sql<number>`count(distinct ${donations.donorId})::int`,
      })
      .from(campaigns)
      .leftJoin(donations, eq(donations.campaignId, campaigns.id))
      .where(eq(campaigns.status, 'active'))
      .groupBy(campaigns.id)
      .limit(1);

    if (!row) return new Response('Not found', { status: 404 });

    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.title,
      description: row.description,
      goal: parseFloat(row.goal),
      currency: row.currency,
      status: row.status,
      totalRaised: parseFloat(row.raised),
      donorCount: row.donorCount,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
    };
  })

  // Paginated + sorted + filtered donations (with joined donor/fundraiser/location)
  .get('/api/donations', async ({ query }) => {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '10')));
    const offset = (page - 1) * limit;
    const sortKey = (query.sort ?? 'date') as SortParams['sort'];
    const order = query.order === 'asc' ? 'asc' : 'desc';

    const sortCol = SORT_COLUMN_MAP[sortKey] ?? donations.date;
    const orderFn = order === 'asc' ? asc : desc;

    const conditions: SQL[] = [];

    if (query.search?.trim()) {
      const q = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(donors.firstName, q),
          ilike(donors.lastName, q),
          ilike(sql`${donors.firstName} || ' ' || ${donors.lastName}`, q),
        )!,
      );
    }
    if (query.paymentMethod) {
      conditions.push(eq(donations.paymentMethod, query.paymentMethod as PaymentMethod));
    }
    if (query.channel) {
      conditions.push(eq(donations.channel, query.channel as DonationChannel));
    }
    if (query.minAmount) {
      conditions.push(gte(donations.amount, query.minAmount));
    }
    if (query.maxAmount) {
      conditions.push(lte(donations.amount, query.maxAmount));
    }
    if (query.dateFrom) {
      conditions.push(gte(donations.date, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(donations.date, end));
    }
    if (query.campaignId) {
      conditions.push(eq(donations.campaignId, parseInt(query.campaignId)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      donationsBaseQuery(where).orderBy(orderFn(sortCol)).limit(limit).offset(offset),
      db
        .select({ total: count() })
        .from(donations)
        .leftJoin(donors, eq(donations.donorId, donors.id))
        .where(where),
    ]);
    const { total } = countRows[0]!;

    const totalPages = Math.ceil(total / limit);
    return {
      data: rows.map(r => shapeRow(r as JoinedRow)),
      pagination: { page, limit, total, totalPages },
      total,
      page,
      limit,
      totalPages,
    };
  })

  // Create donation — upsert donor + optional location, then insert donation
  .post(
    '/api/donations',
    async ({ body }) => {
      // 1. Resolve donor (match by email if provided, else always create)
      let donorId: number;
      if (body.email) {
        const [existing] = await db
          .select({ id: donors.id })
          .from(donors)
          .where(eq(donors.email, body.email))
          .limit(1);
        if (existing) {
          donorId = existing.id;
        } else {
          const [created] = await db
            .insert(donors)
            .values({ firstName: body.firstName, lastName: body.lastName, email: body.email, phone: body.phone ?? null })
            .returning({ id: donors.id });
          donorId = created!.id;
        }
      } else {
        const [created] = await db
          .insert(donors)
          .values({ firstName: body.firstName, lastName: body.lastName, phone: body.phone ?? null })
          .returning({ id: donors.id });
        donorId = created!.id;
      }

      // 2. Resolve location (find or create by city+country)
      let locationId: number | null = null;
      if (body.city && body.country) {
        const [existingLoc] = await db
          .select({ id: donationLocations.id })
          .from(donationLocations)
          .where(and(eq(donationLocations.city, body.city), eq(donationLocations.country, body.country)))
          .limit(1);
        if (existingLoc) {
          locationId = existingLoc.id;
        } else {
          const [created] = await db
            .insert(donationLocations)
            .values({ city: body.city, country: body.country })
            .returning({ id: donationLocations.id });
          locationId = created!.id;
        }
      }

      // 3. Insert donation
      const [inserted] = await db
        .insert(donations)
        .values({
          campaignId: body.campaignId,
          donorId,
          fundraiserId: body.fundraiserId ?? null,
          locationId,
          amount: String(body.amount),
          currency: body.currency ?? 'EUR',
          paymentMethod: normalizePaymentMethod(body.paymentMethod as AnyPaymentMethod),
          channel: body.channel,
          isRecurring: body.isRecurring ?? false,
          isMock: false,
        })
        .returning({ id: donations.id });

      // 4. Re-fetch with joins for consistent response shape
      const [shaped] = await donationsBaseQuery(eq(donations.id, inserted!.id));
      const donation = shapeRow(shaped as JoinedRow);
      await redis.publish('donations:live', JSON.stringify(donation));
      return donation;
    },
    {
      body: t.Object({
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        email: t.Optional(t.String({ format: 'email' })),
        phone: t.Optional(t.String()),
        amount: t.Number({ minimum: 1 }),
        paymentMethod: t.Union([
          t.Literal('sepa_direct_debit'),
          t.Literal('credit_card'),
          t.Literal('google_pay'),
          t.Literal('apple_pay'),
          t.Literal('paypal'),
          t.Literal('bank_transfer'),
          t.Literal('cash'),
          t.Literal('card'),
          t.Literal('sepa'),
        ]),
        channel: t.Union([
          t.Literal('street'),
          t.Literal('door_to_door'),
          t.Literal('event'),
          t.Literal('phone'),
          t.Literal('email'),
          t.Literal('social_media'),
        ]),
        campaignId: t.Number({ minimum: 1 }),
        fundraiserId: t.Optional(t.Number()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        isRecurring: t.Optional(t.Boolean()),
      }),
    },
  )

  // Generate mock donations
  .post(
    '/api/mock/generate',
    async ({ body }) => {
      const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.status, 'active')).limit(1);
      if (!campaign) return new Response('No active campaign', { status: 404 });
      const inserted = await generateMockDonations(body as MockDataParams, campaign.id);
      return { inserted };
    },
    {
      body: t.Object({
        count: t.Number({ minimum: 1, maximum: 10000 }),
        minAmount: t.Number({ minimum: 1 }),
        maxAmount: t.Number({ minimum: 1 }),
        startDate: t.String(),
        endDate: t.String(),
      }),
    },
  )

  // Delete mock donations (and their orphan donor rows)
  .delete('/api/mock', async () => {
    const deleted = await deleteAllMockDonations();
    return { deleted };
  })

  // Start donation stream
  .post(
    '/api/mock/stream/start',
    async ({ body }) => {
      if (streamTimer !== null) clearInterval(streamTimer);
      streamConfig = body as StreamConfig;
      streamCount = 0;
      streamStartedAt = new Date().toISOString();
      streamTimer = setInterval(() => { streamTick(); }, streamConfig.intervalMs);
      return { running: true, config: streamConfig, totalGenerated: 0, startedAt: streamStartedAt };
    },
    {
      body: t.Object({
        campaignId: t.Number({ minimum: 1 }),
        intervalMs: t.Number({ minimum: 100, maximum: 10000 }),
        minAmount:  t.Number({ minimum: 1 }),
        maxAmount:  t.Number({ minimum: 1 }),
      }),
    },
  )

  // Stop donation stream
  .post('/api/mock/stream/stop', () => {
    if (streamTimer !== null) { clearInterval(streamTimer); streamTimer = null; }
    const result = { running: false, config: streamConfig, totalGenerated: streamCount, startedAt: streamStartedAt };
    streamConfig = null; streamCount = 0; streamStartedAt = null;
    return result;
  })

  // Stream status
  .get('/api/mock/stream/status', () => ({
    running: streamTimer !== null,
    config: streamConfig,
    totalGenerated: streamCount,
    startedAt: streamStartedAt,
  }))

  // LLM model status
  .get('/api/model-status', async () => {
    try {
      const res = await fetch(`${LLM_SERVICE_URL}/status`);
      if (!res.ok) {
        return { phase: 'error', progress: 0, detail: '', error: 'LLM service unavailable', model_loaded: false };
      }
      return res.json();
    } catch {
      return { phase: 'error', progress: 0, detail: '', error: 'LLM service unreachable', model_loaded: false };
    }
  })

  .post('/api/pause-download', async () => {
    try {
      const res = await fetch(`${LLM_SERVICE_URL}/pause`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json() as { detail?: string };
        return new Response(JSON.stringify({ error: body.detail ?? 'Cannot pause' }), { status: res.status });
      }
      return res.json();
    } catch {
      return new Response(JSON.stringify({ error: 'LLM service unreachable' }), { status: 503 });
    }
  })

  .post('/api/resume-download', async () => {
    try {
      const res = await fetch(`${LLM_SERVICE_URL}/resume`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json() as { detail?: string };
        return new Response(JSON.stringify({ error: body.detail ?? 'Cannot resume' }), { status: res.status });
      }
      return res.json();
    } catch {
      return new Response(JSON.stringify({ error: 'LLM service unreachable' }), { status: 503 });
    }
  })

  // ── Chat sessions ────────────────────────────────────────────────────────────

  .post('/api/chat/sessions', async ({ session }) => {
    const [created] = await db
      .insert(chatSessions)
      .values({ userId: session!.user.id, title: 'New conversation' })
      .returning({ id: chatSessions.id });
    return { sessionId: created!.id };
  })

  .get(
    '/api/chat/sessions',
    async ({ session, query }) => {
      const whereClause = query.mine === 'true'
        ? and(eq(chatSessions.userId, session!.user.id))
        : undefined;

      const rows = await db
        .select({
          id: chatSessions.id,
          userId: chatSessions.userId,
          userName: authUsers.name,
          title: chatSessions.title,
          shareToken: chatSessions.shareToken,
          createdAt: chatSessions.createdAt,
        })
        .from(chatSessions)
        .innerJoin(authUsers, eq(chatSessions.userId, authUsers.id))
        .where(whereClause)
        .orderBy(desc(chatSessions.createdAt))
        .limit(50);

      return rows.map((r): ChatSession => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        title: r.title,
        shareToken: r.shareToken,
        createdAt: r.createdAt.toISOString(),
      }));
    },
    { query: t.Object({ mine: t.Optional(t.String()) }) },
  )

  .get('/api/chat/sessions/:id', async ({ params }) => {
    const sessionId = parseInt(params.id);
    const [sess] = await db
      .select({ id: chatSessions.id, userId: chatSessions.userId })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    if (!sess) return new Response('Not found', { status: 404 });

    const msgs = await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    return {
      sessionUserId: sess.userId,
      messages: msgs.map((m): ChatMessage => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role as 'user' | 'assistant',
        text: m.text,
        sql: m.sql,
        results: m.results as Record<string, unknown>[] | null,
        isError: m.isError,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  })

  .post('/api/chat/sessions/:id/share', async ({ params, session }) => {
    const sessionId = parseInt(params.id);
    const [sess] = await db
      .select({ id: chatSessions.id, shareToken: chatSessions.shareToken })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, session!.user.id)))
      .limit(1);
    if (!sess) return new Response('Not found', { status: 404 });

    const token = sess.shareToken ?? crypto.randomUUID();
    await db.update(chatSessions).set({ shareToken: token }).where(eq(chatSessions.id, sessionId));
    return { shareToken: token, shareUrl: `/?chat=${token}` };
  })

  .get('/api/chat/share/:token', async ({ params }) => {
    const [sess] = await db
      .select({ id: chatSessions.id, title: chatSessions.title, userId: chatSessions.userId })
      .from(chatSessions)
      .where(eq(chatSessions.shareToken, params.token))
      .limit(1);
    if (!sess) return new Response('Not found', { status: 404 });

    const [user] = await db.select({ name: authUsers.name })
      .from(authUsers).where(eq(authUsers.id, sess.userId)).limit(1);

    const msgs = await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sess.id))
      .orderBy(asc(chatMessages.createdAt));

    return {
      title: sess.title,
      userName: user?.name ?? 'Unknown',
      messages: msgs.map((m): ChatMessage => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role as 'user' | 'assistant',
        text: m.text,
        sql: m.sql,
        results: m.results as Record<string, unknown>[] | null,
        isError: m.isError,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  })

  // Natural language → SQL via LLM
  .post(
    '/api/chat',
    async ({ body, session }) => {
      const { question, sessionId, context } = body;
      const enrichedQuestion = buildEnrichedQuestion(question, context);
      const displayQuestion = context?.length
        ? `${question}  ${context.map(c => `[${c.label}]`).join(' ')}`
        : question;

      // Verify ownership
      const [sess] = await db
        .select({ id: chatSessions.id })
        .from(chatSessions)
        .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, session!.user.id)))
        .limit(1);
      if (!sess) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

      // Count messages before insert to detect first message
      const countResult = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId));
      const cnt = countResult[0]?.cnt ?? 0;

      await db.insert(chatMessages).values({ sessionId, role: 'user', text: displayQuestion });

      if (cnt === 0) {
        await db.update(chatSessions)
          .set({ title: displayQuestion.slice(0, 80), updatedAt: new Date() })
          .where(eq(chatSessions.id, sessionId));
      }

      let generatedSql: string;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      try {
        const llmRes = await fetch(`${LLM_SERVICE_URL}/sql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: enrichedQuestion }),
          signal: controller.signal,
        });
        if (!llmRes.ok) {
          await db.insert(chatMessages).values({ sessionId, role: 'assistant', text: 'LLM service error', isError: true });
          return new Response(JSON.stringify({ error: 'LLM service error' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        }
        const data = await llmRes.json() as { sql: string };
        generatedSql = data.sql;
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        const errMsg = isAbort ? 'LLM timed out' : 'Could not reach LLM service';
        await db.insert(chatMessages).values({ sessionId, role: 'assistant', text: errMsg, isError: true });
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      } finally {
        clearTimeout(timeout);
      }

      generatedSql = generatedSql.trim().replace(/;\s*$/, '');

      if (!isSqlSafe(generatedSql)) {
        const errMsg = 'I couldn\'t understand that question. Try rephrasing it.';
        await db.insert(chatMessages).values({ sessionId, role: 'assistant', text: errMsg, isError: true });
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        );
      }

      let safeSql = generatedSql;
      if (!/\blimit\b/i.test(safeSql)) safeSql += ' LIMIT 100';

      try {
        const rows = await db.execute(sql.raw(safeSql));
        const results = Array.from(rows as unknown as Record<string, unknown>[]);
        const count = results.length;
        const firstRow = results[0];
        const columns = count > 0 && firstRow ? Object.keys(firstRow) : [];
        const rowsArr = results.map(r => Object.values(r));
        const firstCell = rowsArr[0]?.[0];
        const text = count === 0
          ? 'No results found.'
          : count === 1 && columns.length === 1
            ? String(firstCell)
            : `Found ${count} result${count !== 1 ? 's' : ''}.`;

        await db.insert(chatMessages).values({ sessionId, role: 'assistant', text, sql: safeSql, results });
        return { question, sql: safeSql, results, sessionId };
      } catch {
        const errMsg = 'I couldn\'t answer that question. Try asking in a different way.';
        await db.insert(chatMessages).values({ sessionId, role: 'assistant', text: errMsg, isError: true });
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        );
      }
    },
    {
      body: t.Object({
        question: t.String({ minLength: 1, maxLength: 500 }),
        sessionId: t.Number({ minimum: 1 }),
        context: t.Optional(t.Array(t.Object({
          type: t.String(),
          label: t.String(),
          id: t.Union([t.Number(), t.Null()]),
          value: t.Optional(t.String()),
        }))),
      }),
    },
  )

  // System health — server, database, and LLM status in one call; records spikes
  .get('/api/health', async () => {
    const mem = process.memoryUsage();

    let dbStatus: 'ok' | 'slow' | 'error' = 'error';
    let dbMs = 0;
    const dbStart = performance.now();
    try {
      await db.execute(sql`SELECT 1`);
      dbMs = Math.round(performance.now() - dbStart);
      dbStatus = dbMs < 500 ? 'ok' : 'slow';
    } catch {
      dbMs = Math.round(performance.now() - dbStart);
    }

    let llm: { status: string; phase?: string; modelLoaded?: boolean; progress?: number } = { status: 'unknown' };
    try {
      const r = await fetch(`${LLM_SERVICE_URL}/status`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const d = await r.json() as { phase: string; progress: number; model_loaded: boolean };
        llm = { status: 'ok', phase: d.phase, modelLoaded: d.model_loaded, progress: d.progress };
      } else {
        llm = { status: 'error' };
      }
    } catch {
      llm = { status: 'unreachable' };
    }

    // Detect and record spikes — debounced via Redis SETNX (survives restarts)
    const newSpikes: { service: string; metric: string; value: string | null; threshold: string | null; severity: string }[] = [];

    const memRss = Math.round(mem.rss / 1e6);

    await Promise.all([
      (async () => {
        if (dbMs > 100) {
          const sev = dbMs > 500 ? 'critical' : 'warning';
          if (await shouldRecordSpike(`database:response_time:${sev}`)) {
            newSpikes.push({ service: 'database', metric: 'response_time', value: String(dbMs), threshold: dbMs > 500 ? '500' : '100', severity: sev });
          }
        }
      })(),
      (async () => {
        if (dbStatus === 'error' && await shouldRecordSpike('database:connection:critical')) {
          newSpikes.push({ service: 'database', metric: 'connection', value: null, threshold: null, severity: 'critical' });
        }
      })(),
      (async () => {
        if ((llm.status === 'error' || llm.status === 'unreachable') && await shouldRecordSpike(`llm:status:${llm.status}`)) {
          newSpikes.push({ service: 'llm', metric: 'status', value: null, threshold: null, severity: 'warning' });
        }
      })(),
      (async () => {
        if (memRss > 200) {
          const sev = memRss > 500 ? 'critical' : 'warning';
          if (await shouldRecordSpike(`server:memory_rss:${sev}`)) {
            newSpikes.push({ service: 'server', metric: 'memory_rss', value: String(memRss), threshold: memRss > 500 ? '500' : '200', severity: sev });
          }
        }
      })(),
    ]);

    if (newSpikes.length > 0) {
      db.insert(spikes).values(newSpikes).catch(console.error);
    }

    return {
      timestamp: new Date().toISOString(),
      server: {
        status: 'ok' as const,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: {
          rss: memRss,
          heapUsed: Math.round(mem.heapUsed / 1e6),
          heapTotal: Math.round(mem.heapTotal / 1e6),
        },
        wsConnections: wsClients.size,
      },
      database: { status: dbStatus, responseTimeMs: dbMs },
      llm,
    };
  })

  // Recent spikes — last 100 sorted newest first
  .get('/api/spikes', async () => {
    const rows = await db
      .select()
      .from(spikes)
      .orderBy(desc(spikes.createdAt))
      .limit(100);
    return rows.map(r => ({
      id: r.id,
      service: r.service,
      metric: r.metric,
      value: r.value !== null ? parseFloat(r.value) : null,
      threshold: r.threshold !== null ? parseFloat(r.threshold) : null,
      severity: r.severity,
      createdAt: r.createdAt.toISOString(),
    }));
  })

  // Create organization
  .post(
    '/api/organizations',
    async ({ body }) => {
      const [row] = await db
        .insert(organizations)
        .values({
          name:    body.name,
          type:    body.type as 'npo' | 'fundraising_agency',
          country: body.country ?? null,
          website: body.website ?? null,
        })
        .returning();
      return row;
    },
    {
      body: t.Object({
        name:    t.String({ minLength: 1 }),
        type:    t.Union([t.Literal('npo'), t.Literal('fundraising_agency')]),
        country: t.Optional(t.Nullable(t.String())),
        website: t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  // Create campaign
  .post(
    '/api/campaigns',
    async ({ body }) => {
      const [row] = await db
        .insert(campaigns)
        .values({
          organizationId: body.organizationId,
          title:          body.title,
          description:    body.description ?? null,
          goal:           String(body.goal),
          currency:       body.currency ?? 'EUR',
          status:         (body.status ?? 'active') as 'draft' | 'active' | 'paused' | 'completed',
          startDate:      body.startDate ? new Date(body.startDate) : null,
          endDate:        body.endDate   ? new Date(body.endDate)   : null,
        })
        .returning({ id: campaigns.id });
      return row;
    },
    {
      body: t.Object({
        organizationId: t.Number({ minimum: 1 }),
        title:          t.String({ minLength: 1 }),
        description:    t.Optional(t.Nullable(t.String())),
        goal:           t.Number({ minimum: 1 }),
        currency:       t.Optional(t.String()),
        status:         t.Optional(t.Union([
          t.Literal('draft'),
          t.Literal('active'),
          t.Literal('paused'),
          t.Literal('completed'),
        ])),
        startDate: t.Optional(t.Nullable(t.String())),
        endDate:   t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  // Create fundraiser
  .post(
    '/api/fundraisers',
    async ({ body }) => {
      const [row] = await db
        .insert(fundraisers)
        .values({
          organizationId: body.organizationId,
          firstName:      body.firstName,
          lastName:       body.lastName,
          email:          body.email ?? null,
          phone:          body.phone ?? null,
        })
        .returning({ id: fundraisers.id });
      return row;
    },
    {
      body: t.Object({
        organizationId: t.Number({ minimum: 1 }),
        firstName:      t.String({ minLength: 1 }),
        lastName:       t.String({ minLength: 1 }),
        email:          t.Optional(t.Nullable(t.String())),
        phone:          t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  // All campaigns with aggregated stats + org name
  .get('/api/campaigns', async () => {
    const rows = await db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        organizationName: organizations.name,
        name: campaigns.title,
        description: campaigns.description,
        goal: campaigns.goal,
        currency: campaigns.currency,
        status: campaigns.status,
        totalRaised: sql<string>`coalesce(sum(${donations.amount}), 0)`,
        donorCount: sql<number>`count(distinct ${donations.donorId})::int`,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
      })
      .from(campaigns)
      .leftJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .leftJoin(donations, eq(donations.campaignId, campaigns.id))
      .groupBy(campaigns.id, organizations.name)
      .orderBy(campaigns.status, campaigns.startDate);

    return rows.map(r => ({
      ...r,
      goal: parseFloat(r.goal),
      totalRaised: parseFloat(r.totalRaised),
      startDate: r.startDate?.toISOString() ?? null,
      endDate: r.endDate?.toISOString() ?? null,
    }));
  })

  // Flat organization list
  .get('/api/organizations', async () => {
    return db.select().from(organizations).orderBy(organizations.name);
  })

  // Fundraisers with total raised, optional campaign filter
  .get('/api/fundraisers', async ({ query }) => {
    const campaignId = query.campaignId ? parseInt(query.campaignId as string) : null;
    const page = Math.max(1, parseInt((query.page as string) ?? '1'));
    const limit = Math.min(100, parseInt((query.limit as string) ?? '50'));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (campaignId) {
      conditions.push(eq(campaignFundraisers.campaignId, campaignId));
    }
    if ((query.search as string | undefined)?.trim()) {
      const q = `%${(query.search as string).trim()}%`;
      conditions.push(or(
        ilike(fundraisers.firstName, q),
        ilike(fundraisers.lastName, q),
        ilike(sql`${fundraisers.firstName} || ' ' || ${fundraisers.lastName}`, q),
      )!);
    }
    if ((query.isActive as string | undefined) !== undefined && (query.isActive as string) !== '') {
      conditions.push(eq(fundraisers.isActive, (query.isActive as string) === 'true'));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: fundraisers.id,
        organizationId: fundraisers.organizationId,
        firstName: fundraisers.firstName,
        lastName: fundraisers.lastName,
        email: fundraisers.email,
        phone: fundraisers.phone,
        isActive: fundraisers.isActive,
        totalRaised: sql<string>`coalesce(sum(${donations.amount}), 0)`,
        donationCount: sql<number>`count(${donations.id})::int`,
      })
      .from(fundraisers)
      .leftJoin(campaignFundraisers, eq(campaignFundraisers.fundraiserId, fundraisers.id))
      .leftJoin(donations, and(
        eq(donations.fundraiserId, fundraisers.id),
        campaignId ? eq(donations.campaignId, campaignId) : sql`true`,
      ))
      .where(where)
      .groupBy(fundraisers.id)
      .orderBy(desc(sql`coalesce(sum(${donations.amount}), 0)`))
      .limit(limit)
      .offset(offset);

    const [fundraiserCountRow] = await db
      .select({ total: count() })
      .from(fundraisers)
      .leftJoin(campaignFundraisers, eq(campaignFundraisers.fundraiserId, fundraisers.id))
      .where(where);
    const total = fundraiserCountRow!.total;

    return {
      data: rows.map(r => ({ ...r, totalRaised: parseFloat(r.totalRaised) })),
      total,
      page,
      limit,
    };
  })

  // Paginated donor list with aggregated stats
  .get('/api/donors', async ({ query }) => {
    const page = Math.max(1, parseInt((query.page as string) ?? '1'));
    const limit = Math.min(100, parseInt((query.limit as string) ?? '20'));
    const offset = (page - 1) * limit;
    const campaignId = query.campaignId ? parseInt(query.campaignId as string) : null;

    const conditions: SQL[] = [];
    if ((query.search as string | undefined)?.trim()) {
      const q = `%${(query.search as string).trim()}%`;
      conditions.push(or(
        ilike(donors.firstName, q),
        ilike(donors.lastName, q),
        ilike(sql`${donors.firstName} || ' ' || ${donors.lastName}`, q),
      )!);
    }
    if ((query.country as string | undefined)?.trim()) {
      conditions.push(ilike(donors.country, (query.country as string).trim()));
    }
    if (campaignId) {
      conditions.push(eq(donations.campaignId, campaignId));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: donors.id,
        firstName: donors.firstName,
        lastName: donors.lastName,
        email: donors.email,
        phone: donors.phone,
        city: donors.city,
        country: donors.country,
        totalDonated: sql<string>`coalesce(sum(${donations.amount}), 0)`,
        donationCount: sql<number>`count(${donations.id})::int`,
        lastDonationAt: sql<string | null>`max(${donations.date})`,
      })
      .from(donors)
      .leftJoin(donations, eq(donations.donorId, donors.id))
      .where(where)
      .groupBy(donors.id)
      .orderBy(desc(sql`coalesce(sum(${donations.amount}), 0)`))
      .limit(limit)
      .offset(offset);

    const [donorCountRow] = await db
      .select({ total: count() })
      .from(donors)
      .leftJoin(donations, eq(donations.donorId, donors.id))
      .where(where);
    const total = donorCountRow!.total;

    const totalPages = Math.ceil(total / limit);
    return {
      data: rows.map(r => ({
        ...r,
        totalDonated: parseFloat(r.totalDonated),
        lastDonationAt: r.lastDonationAt ?? null,
      })),
      pagination: { page, limit, total, totalPages },
      total, page, limit, totalPages,
    };
  })

  // Lightweight chart breakdown for the dashboard
  .get('/api/donations/chart', async ({ query }) => {
    const campaignId = query.campaignId ? parseInt(query.campaignId as string) : null;
    const where = campaignId ? eq(donations.campaignId, campaignId) : undefined;

    const [byChannel, byPaymentMethod, byDate] = await Promise.all([
      db.select({
        label: donations.channel,
        value: sql<string>`sum(${donations.amount})`,
        count: sql<number>`count(*)::int`,
      }).from(donations).where(where).groupBy(donations.channel),
      db.select({
        label: donations.paymentMethod,
        value: sql<string>`sum(${donations.amount})`,
        count: sql<number>`count(*)::int`,
      }).from(donations).where(where).groupBy(donations.paymentMethod),
      db.select({
        date: sql<string>`date_trunc('day', ${donations.date})::date::text`,
        total: sql<string>`sum(${donations.amount})`,
      }).from(donations).where(where)
        .groupBy(sql`date_trunc('day', ${donations.date})`)
        .orderBy(sql`date_trunc('day', ${donations.date})`),
    ]);

    return {
      byChannel: byChannel.map(r => ({ ...r, value: parseFloat(r.value) })),
      byPaymentMethod: byPaymentMethod.map(r => ({ ...r, value: parseFloat(r.value) })),
      byDate: byDate.map(r => ({ date: r.date, total: parseFloat(r.total) })),
    };
  })

  // WebSocket — real-time donation feed
  .ws('/api/donations/live', {
    open(ws)  { wsClients.add(ws.raw as import('bun').ServerWebSocket<unknown>); },
    close(ws) { wsClients.delete(ws.raw as import('bun').ServerWebSocket<unknown>); },
    message() { /* server-push only */ },
  })

  .listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);

redisSub.subscribe('donations:live', (msg: string) => {
  broadcastDonation(JSON.parse(msg) as Donation);
});

console.log(`API running at ${app.server?.hostname}:${app.server?.port}`);
