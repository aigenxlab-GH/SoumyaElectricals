import pino from 'pino'
import { config } from '../config'

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: [
    'req.body.password',
    'req.body.old_password',
    'req.body.new_password',
    'req.body.aadhaar',
  ],
})
