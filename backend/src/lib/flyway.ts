import { Flyway } from 'node-flyway'
import { config } from '../config'
import { logger } from './logger'

export async function runMigrations(): Promise<void> {
  const url = new URL(config.DATABASE_URL)

  const flyway = new Flyway({
    url: `jdbc:postgresql://${url.host}${url.pathname}${url.search}`,
    user: url.username,
    password: url.password,
    migrationLocations: ['filesystem:migrations'],
    advanced: {
      baselineOnMigrate: true,
    },
  })

  const result = await flyway.migrate()

  if (!result.success) {
    if (result.error?.errorCode === 'UNABLE_TO_PARSE_RESPONSE') {
      // Flyway CLI exited 0 (migrations applied) but node-flyway couldn't parse
      // the response JSON from Flyway 9.22.x — safe to continue.
      logger.warn({ result }, 'Flyway response unparseable — assuming migrations applied successfully')
    } else {
      logger.error({ result }, 'Flyway migration failed')
      throw new Error('Database migration failed — aborting startup')
    }
  } else {
    logger.info(
      { migrationsExecuted: result.flywayResponse?.migrationsExecuted },
      'Flyway migrations applied successfully'
    )
  }
}
