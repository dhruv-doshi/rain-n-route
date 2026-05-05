import { describe, expect, it } from 'vitest';
import { runMigrations, CURRENT_VERSION } from '@/store/migrations';

describe('runMigrations', () => {
  it('returns state unchanged when already at CURRENT_VERSION', () => {
    const state = { locations: [], schemaVersion: CURRENT_VERSION };
    expect(runMigrations(state, CURRENT_VERSION)).toEqual(state);
  });

  it('applies v0 → v1 migration on hand-crafted blob', () => {
    const v0blob = { locations: [{ id: 'x', label: 'Old' }] };
    const result = runMigrations(v0blob, 0);
    // v0→v1 is a no-op pass-through; verify the state is returned
    expect(result).toEqual(v0blob);
  });

  it('treats null/undefined persisted state as empty object', () => {
    expect(runMigrations(null, 0)).toEqual({});
    expect(runMigrations(undefined, 0)).toEqual({});
  });
});
