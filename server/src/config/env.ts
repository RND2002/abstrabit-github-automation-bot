import { z } from 'zod';
import dotenv from 'dotenv';


const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_REDIRECT_URI: z.string().url(),
  ENCRYPTION_KEY: z.string().min(32).describe('AES encryption key (32 chars)'),
  SESSION_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url(),
  WEBHOOK_SECRET: z.string().min(8),
  API_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
