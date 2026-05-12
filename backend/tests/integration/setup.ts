// Integration test setup — attempts Flyway migrations but continues if they fail
// (remote Supabase migrations are applied manually; tests run against the live project)
import { runMigrations } from '../../src/lib/flyway'

beforeAll(async () => {
  try {
    await runMigrations()
  } catch {
    // Migrations already applied or Flyway unavailable — tests continue
  }
}, 30_000)
