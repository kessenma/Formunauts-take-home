export const redis    = new Bun.RedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379');
export const redisSub = new Bun.RedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379');
