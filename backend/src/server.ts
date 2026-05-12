import 'dotenv/config'
import { config } from './config'
import { runMigrations } from './lib/flyway'
import { logger } from './lib/logger'
import app from './app'

async function start() {
  try {
    await runMigrations()
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'Server started')
    })
  } catch (err) {
    logger.error({ err }, 'Server failed to start')
    process.exit(1)
  }
}

start()
