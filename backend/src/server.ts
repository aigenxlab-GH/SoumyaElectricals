import 'dotenv/config'
import { config } from './config'
import { runMigrations } from './lib/flyway'
import { logger } from './lib/logger'
import app from './app'

// SKIP_MIGRATIONS=true on hosts without Java (Render free tier, etc.) —
// migrations are applied manually in Supabase SQL editor in that case.
const skipMigrations = process.env.SKIP_MIGRATIONS === 'true'

async function start() {
  try {
    if (!skipMigrations) await runMigrations()
    else logger.warn('SKIP_MIGRATIONS=true — Flyway not run; ensure migrations are applied manually')
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'Server started')
    })
  } catch (err) {
    logger.error({ err }, 'Server failed to start')
    process.exit(1)
  }
}

start()
