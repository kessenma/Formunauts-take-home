import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/client';
import { redis } from './db/redis';
import { authUsers, authSessions, authAccounts, authVerifications } from './db/schema';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUsers,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),
  // Redis read-through cache — session lookups hit Redis instead of Postgres on every request
  secondaryStorage: {
    get:    (key)           => redis.get(key),
    set:    (key, val, ttl) => ttl
      ? void redis.set(key, val, 'EX', ttl)
      : void redis.set(key, val),
    delete: (key)           => void redis.del(key),
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async () => { /* no-op: token is read from DB by the dev endpoint */ },
  },
  session: { expiresIn: 7 * 24 * 60 * 60 },
  trustedOrigins: ['http://localhost:4200'],
  advanced: { cookiePrefix: 'formunauts', useSecureCookies: false },
});
