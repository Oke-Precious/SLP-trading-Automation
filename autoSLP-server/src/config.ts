import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(3002),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/autoslp?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379/0'),
  JWT_SECRET: z.string().default('autoslp-default-jwt-secret-key-for-development-and-preview-deployment-only'),
  JWT_REFRESH_SECRET: z.string().default('autoslp-default-jwt-refresh-secret-key-for-development-and-preview-deployment-only')
});

export const config = configSchema.parse(process.env);
export type Config = z.infer<typeof configSchema>;
