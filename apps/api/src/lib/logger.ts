import pino, { type Logger as PinoLogger } from 'pino';
import { env } from '../env';

const isProd = env.NODE_ENV === 'production';

// Paths scrubbed from every log record. Add anything that could carry PII,
// credentials, or auth capabilities. Redaction uses fast-redact paths, so
// nested wildcards need explicit depth (e.g. `req.headers.cookie`).
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.password_hash',
  '*.sessionToken',
  '*.session_token',
  '*.token',
  '*.cardNumber',
  '*.cvv',
  '*.cvc',
];

export const logger: PinoLogger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'api', env: env.NODE_ENV },
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname,service,env',
          singleLine: false,
        },
      },
});

export type Logger = PinoLogger;
