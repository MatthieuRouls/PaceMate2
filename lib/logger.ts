/**
 * Logger structuré pour PaceMate2.
 *
 * - En développement : affiche des lignes colorées dans la console.
 * - En production   : émet du JSON structuré (compatible Datadog, Sentry, etc.)
 *                     et filtre les niveaux "info" et "debug" pour limiter le bruit.
 *
 * Usage :
 *   import { logger } from '@/lib/logger';
 *   logger.info('[actions] session created', { sessionId });
 *   logger.warn('[stats] runner_connections table missing');
 *   logger.error('[api] Claude timeout', err);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  context?: unknown;
  ts: string;
}

const isProd = process.env.NODE_ENV === 'production';

function emit(level: LogLevel, msg: string, context?: unknown) {
  // En production, on ne loggue que warn et error
  if (isProd && (level === 'debug' || level === 'info')) return;

  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...(context !== undefined ? { context } : {}),
  };

  if (isProd) {
    // JSON structuré pour les agrégateurs de logs (une ligne par event)
    const line = JSON.stringify(entry);
    if (level === 'error') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
    return;
  }

  // Dev : logs lisibles avec préfixe coloré
  const prefix: Record<LogLevel, string> = {
    debug: '\x1b[37m[DBG]\x1b[0m',
    info:  '\x1b[36m[INF]\x1b[0m',
    warn:  '\x1b[33m[WRN]\x1b[0m',
    error: '\x1b[31m[ERR]\x1b[0m',
  };
  const formatted = `${prefix[level]} ${msg}`;
  if (context !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](formatted, context);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](formatted);
  }
}

export const logger = {
  debug: (msg: string, context?: unknown) => emit('debug', msg, context),
  info:  (msg: string, context?: unknown) => emit('info',  msg, context),
  warn:  (msg: string, context?: unknown) => emit('warn',  msg, context),
  error: (msg: string, context?: unknown) => emit('error', msg, context),
};
