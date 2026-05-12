import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_SENTRY_DSN: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
})

export const config = envSchema.parse(import.meta.env)
