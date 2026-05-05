/**
 * Migration framework for persisted Zustand stores.
 *
 * Each store passes its raw persisted JSON through runMigrations before
 * Zustand merges it into state. Migrations are applied in order from
 * fromVersion up to CURRENT_VERSION.
 */

export const CURRENT_VERSION = 1;

type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
  // v0 → v1: first-ever migration; add any new required fields with defaults
  1: (state) => state,
};

export function runMigrations(
  persistedState: unknown,
  fromVersion: number,
): Record<string, unknown> {
  let state = (persistedState ?? {}) as Record<string, unknown>;
  for (let v = fromVersion + 1; v <= CURRENT_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) state = migrate(state);
  }
  return state;
}
