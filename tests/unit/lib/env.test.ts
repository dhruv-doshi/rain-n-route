import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ServiceErrorLike {
  code: string;
  message: string;
  retryable: boolean;
  name: string;
}

// We need to reset module cache between tests so env vars are re-evaluated.
// Use dynamic import with vi.resetModules().

describe('isMockMode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when NEXT_PUBLIC_USE_MOCK_SERVICES is "true"', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_SERVICES = 'true';
    process.env.NODE_ENV = 'development';
    const { isMockMode } = await import('@/lib/env');
    expect(isMockMode()).toBe(true);
  });

  it('returns true when NODE_ENV is "test"', async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_SERVICES;
    process.env.NODE_ENV = 'test';
    const { isMockMode } = await import('@/lib/env');
    expect(isMockMode()).toBe(true);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK_SERVICES is not set and NODE_ENV is not test', async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_SERVICES;
    process.env.NODE_ENV = 'development';
    const { isMockMode } = await import('@/lib/env');
    expect(isMockMode()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK_SERVICES is "false"', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_SERVICES = 'false';
    process.env.NODE_ENV = 'development';
    const { isMockMode } = await import('@/lib/env');
    expect(isMockMode()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_USE_MOCK_SERVICES is "TRUE" (case-sensitive)', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_SERVICES = 'TRUE';
    process.env.NODE_ENV = 'development';
    const { isMockMode } = await import('@/lib/env');
    expect(isMockMode()).toBe(false);
  });
});

describe('getMapsConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('mock mode', () => {
    it('returns config with placeholder values without requiring Google keys', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_SERVICES = 'true';
      process.env.NODE_ENV = 'development';
      // Ensure no Google keys are present
      delete process.env.GOOGLE_MAPS_SERVER_KEY;
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

      const { getMapsConfig } = await import('@/lib/env');
      const config = getMapsConfig();

      expect(config.isMockMode).toBe(true);
      expect(config.serverKey).toBeTruthy();
      expect(config.browserKey).toBeTruthy();
      expect(config.mapId).toBeTruthy();
    });

    it('returns mock config when NODE_ENV is test', async () => {
      delete process.env.NEXT_PUBLIC_USE_MOCK_SERVICES;
      process.env.NODE_ENV = 'test';
      delete process.env.GOOGLE_MAPS_SERVER_KEY;

      const { getMapsConfig } = await import('@/lib/env');
      const config = getMapsConfig();

      expect(config.isMockMode).toBe(true);
    });
  });

  describe('live mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_USE_MOCK_SERVICES;
    });

    it('returns valid config when all keys are present', async () => {
      process.env.GOOGLE_MAPS_SERVER_KEY = 'AIzaSyTestServerKey123';
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyTestBrowserKey456';
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'abc123mapid';

      const { getMapsConfig } = await import('@/lib/env');
      const config = getMapsConfig();

      expect(config.serverKey).toBe('AIzaSyTestServerKey123');
      expect(config.browserKey).toBe('AIzaSyTestBrowserKey456');
      expect(config.mapId).toBe('abc123mapid');
      expect(config.isMockMode).toBe(false);
    });

    it('throws PROVIDER_ERROR when server key is missing', async () => {
      delete process.env.GOOGLE_MAPS_SERVER_KEY;
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyTestBrowserKey456';
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'abc123mapid';

      const { getMapsConfig } = await import('@/lib/env');

      let caught: ServiceErrorLike | undefined;
      try {
        getMapsConfig();
      } catch (e) {
        caught = e as ServiceErrorLike;
      }

      expect(caught).toBeDefined();
      expect(caught!.name).toBe('ServiceError');
      expect(caught!.code).toBe('PROVIDER_ERROR');
      expect(caught!.retryable).toBe(false);
      // Must NOT reveal variable names or key values
      expect(caught!.message).not.toContain('GOOGLE_MAPS_SERVER_KEY');
      expect(caught!.message).not.toContain('AIza');
    });

    it('throws PROVIDER_ERROR when browser key is missing', async () => {
      process.env.GOOGLE_MAPS_SERVER_KEY = 'AIzaSyTestServerKey123';
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'abc123mapid';

      const { getMapsConfig } = await import('@/lib/env');

      let caught: ServiceErrorLike | undefined;
      try {
        getMapsConfig();
      } catch (e) {
        caught = e as ServiceErrorLike;
      }

      expect(caught).toBeDefined();
      expect(caught!.name).toBe('ServiceError');
      expect(caught!.code).toBe('PROVIDER_ERROR');
      expect(caught!.retryable).toBe(false);
      expect(caught!.message).not.toContain('NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY');
    });

    it('throws PROVIDER_ERROR when map ID is missing', async () => {
      process.env.GOOGLE_MAPS_SERVER_KEY = 'AIzaSyTestServerKey123';
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyTestBrowserKey456';
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

      const { getMapsConfig } = await import('@/lib/env');

      let caught: ServiceErrorLike | undefined;
      try {
        getMapsConfig();
      } catch (e) {
        caught = e as ServiceErrorLike;
      }

      expect(caught).toBeDefined();
      expect(caught!.name).toBe('ServiceError');
      expect(caught!.code).toBe('PROVIDER_ERROR');
      expect(caught!.retryable).toBe(false);
      expect(caught!.message).not.toContain('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID');
    });

    it('error messages never contain 4+ consecutive chars from any key value', async () => {
      process.env.GOOGLE_MAPS_SERVER_KEY = '';
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyTestBrowserKey456';
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'abc123mapid';

      const { getMapsConfig } = await import('@/lib/env');

      let caught: ServiceErrorLike | undefined;
      try {
        getMapsConfig();
      } catch (e) {
        caught = e as ServiceErrorLike;
      }

      expect(caught).toBeDefined();
      // The message should not contain any substring of 4+ chars from any key
      const browserKey = 'AIzaSyTestBrowserKey456';
      for (let i = 0; i <= browserKey.length - 4; i++) {
        expect(caught!.message).not.toContain(browserKey.slice(i, i + 4));
      }
    });

    it('treats NEXT_PUBLIC_USE_MOCK_SERVICES="false" as live mode', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_SERVICES = 'false';
      process.env.NODE_ENV = 'development';
      delete process.env.GOOGLE_MAPS_SERVER_KEY;

      const { getMapsConfig } = await import('@/lib/env');

      let caught: ServiceErrorLike | undefined;
      try {
        getMapsConfig();
      } catch (e) {
        caught = e as ServiceErrorLike;
      }
      expect(caught).toBeDefined();
      expect(caught!.name).toBe('ServiceError');
    });

    it('treats empty string NEXT_PUBLIC_USE_MOCK_SERVICES as live mode', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_SERVICES = '';
      process.env.NODE_ENV = 'development';
      delete process.env.GOOGLE_MAPS_SERVER_KEY;

      const { getMapsConfig } = await import('@/lib/env');

      let caught: ServiceErrorLike | undefined;
      try {
        getMapsConfig();
      } catch (e) {
        caught = e as ServiceErrorLike;
      }
      expect(caught).toBeDefined();
      expect(caught!.name).toBe('ServiceError');
    });
  });
});
