/**
 * Sentry stub. Opt-in via NEXT_PUBLIC_SENTRY_DSN.
 *
 * We don't bundle the Sentry SDK — that's a deployment-time concern. When the
 * env var is set, we just log with a stable prefix so you can grep production
 * logs. To wire up real Sentry, replace the body of `captureException` with
 * `Sentry.captureException(err)` and add the SDK as a dependency.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;

  console.error('[telemetry-stub]', err, context ?? {});
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!DSN) return;

  console.warn('[telemetry-stub]', message, context ?? {});
}
