import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((value: string) => Number(value)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TOKEN_EXPIRES_SECONDS: z.string().default('900').transform((value: string) => Number(value)),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default('30').transform((value: string) => Number(value)),
  INVITATION_BASE_URL: z.string().default('https://yourdomain.com'),
  APP_DEEP_LINK_SCHEME: z.string().default('pocketflow'),
  ANDROID_PLAY_STORE_URL: z.string().default(''),
  IOS_APP_STORE_URL: z.string().default(''),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((value: string) => Number(value)), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform((value: string) => Number(value)),
  TRUST_PROXY: z.string().default('false').transform((value: string) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue: { path: Array<string | number>; message: string }) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const config = parsed.data;
