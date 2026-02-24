import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((value: string) => Number(value)),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TOKEN_EXPIRES_SECONDS: z.string().default('900').transform((value: string) => Number(value)),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default('30').transform((value: string) => Number(value)),
  INVITATION_BASE_URL: z.string().default('https://yourdomain.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue: { path: Array<string | number>; message: string }) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const config = parsed.data;
