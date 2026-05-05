import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePreferencesStore, DEFAULT_PREFERENCES } from '@/store/preferencesStore';

beforeEach(() => {
  usePreferencesStore.setState({ preferences: { ...DEFAULT_PREFERENCES } });
});

describe('usePreferencesStore', () => {
  it('has correct default values on first load', () => {
    const { preferences } = usePreferencesStore.getState();
    expect(preferences.maxWalkMeters).toBe(1000);
    expect(preferences.weatherSensitivity).toBe('medium');
    expect(preferences.preferredSort).toBe('fastest');
    expect(preferences.theme).toBe('system');
  });

  it('applies a partial patch', () => {
    usePreferencesStore.getState().set({ maxWalkMeters: 500 });
    expect(usePreferencesStore.getState().preferences.maxWalkMeters).toBe(500);
    // other fields unchanged
    expect(usePreferencesStore.getState().preferences.preferredSort).toBe('fastest');
  });

  it('resets to defaults', () => {
    usePreferencesStore.getState().set({ maxWalkMeters: 500, theme: 'dark' });
    usePreferencesStore.getState().reset();
    expect(usePreferencesStore.getState().preferences).toEqual(DEFAULT_PREFERENCES);
  });
});
