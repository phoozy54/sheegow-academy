/**
 * Structured logger for API routes.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("user logged in", { userId: user.id })
 *   logger.error("checkout failed", e, { courseId })
 *
 * - In development: pretty-prints to console with colors
 * - In production: outputs JSON lines (parseable by log aggregators)
 * - Never logs sensitive data (passwords, tokens)
 */

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogContext {
  [key: string]: unknown
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

// Only log at or above this level.
const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'

const LEVEL_EMOJI: Record<LogLevel, string> = {
  debug: '·',
  info: '→',
  warn: '!',
  error: '✗',
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
}
const RESET = '\x1b[0m'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

/** Redact sensitive keys from context before logging. */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'refreshToken',
  'accessToken',
])

function redactValue(value: unknown, depth: number): unknown {
  if (value instanceof Error) return { message: value.message, name: value.name }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return depth > 4 ? '[TRUNCATED]' : value.map((item) => redactValue(item, depth + 1))
  }
  if (value && typeof value === 'object') {
    return depth > 4 ? '[TRUNCATED]' : redact(value as LogContext, depth + 1)
  }
  return value
}

/** Redact sensitive keys at every nesting level, not just the top level. */
function redact(ctx: LogContext, depth = 0): LogContext {
  const safe: LogContext = {}
  for (const [key, value] of Object.entries(ctx)) {
    safe[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? '[REDACTED]'
      : redactValue(value, depth)
  }
  return safe
}

function log(level: LogLevel, scope: string, message: string, ctx?: LogContext, error?: unknown) {
  if (!shouldLog(level)) return

  const timestamp = new Date().toISOString()

  if (process.env.NODE_ENV === 'production') {
    // JSON lines — parseable by log aggregators (Vercel, Datadog, etc.)
    const payload: Record<string, unknown> = {
      ts: timestamp,
      level,
      scope,
      msg: message,
    }
    if (ctx) {
      payload.ctx = redact(ctx)
    }
    if (error instanceof Error) {
      payload.err = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } else if (error) {
      payload.err = String(error)
    }
    // Use stderr for errors, stdout otherwise
    const out = JSON.stringify(payload)
    if (level === 'error' || level === 'warn') {
      console.error(out)
    } else {
      console.log(out)
    }
  } else {
    // Development: pretty-printed colored output
    const color = LEVEL_COLOR[level]
    const emoji = LEVEL_EMOJI[level]
    const ctxStr = ctx && Object.keys(ctx).length > 0
      ? ' ' + JSON.stringify(redact(ctx))
      : ''
    const errStr = error instanceof Error
      ? ` ${error.message}`
      : error
        ? ` ${String(error)}`
        : ''
    console.log(
      `${color}${emoji} [${scope}]${RESET} ${message}${ctxStr}${errStr}`
    )
  }
}

export const logger = {
  debug: (scope: string, message: string, ctx?: LogContext) =>
    log('debug', scope, message, ctx),
  info: (scope: string, message: string, ctx?: LogContext) =>
    log('info', scope, message, ctx),
  warn: (scope: string, message: string, ctx?: LogContext) =>
    log('warn', scope, message, ctx),
  error: (scope: string, message: string, error?: unknown, ctx?: LogContext) =>
    log('error', scope, message, ctx, error),
}

/**
 * Wrap an async API handler with error logging + consistent error response.
 *
 * Usage:
 *   export const POST = withErrorHandler("auth/login", async (req) => { ... })
 */
export function withErrorHandler<T extends unknown[]>(
  scope: string,
  handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (e) {
      logger.error(scope, 'unhandled error', e)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
