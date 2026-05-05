import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock idb-keyval BEFORE importing the adapter
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

import { get, set, del } from 'idb-keyval';
import { idbStorage } from '@/store/persistAdapter';

const mockGet = vi.mocked(get);
const mockSet = vi.mocked(set);
const mockDel = vi.mocked(del);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('idbStorage — happy path', () => {
  it('getItem returns stored value', async () => {
    mockGet.mockResolvedValue('{"data":1}');
    expect(await idbStorage.getItem('key')).toBe('{"data":1}');
  });

  it('getItem returns null when key is absent', async () => {
    mockGet.mockResolvedValue(undefined);
    expect(await idbStorage.getItem('missing')).toBeNull();
  });

  it('setItem stores a value', async () => {
    mockSet.mockResolvedValue(undefined);
    await idbStorage.setItem('key', 'value');
    expect(mockSet).toHaveBeenCalledWith('key', 'value');
  });

  it('removeItem deletes a key', async () => {
    mockDel.mockResolvedValue(undefined);
    await idbStorage.removeItem('key');
    expect(mockDel).toHaveBeenCalledWith('key');
  });
});

describe('idbStorage — memory fallback when idb throws', () => {
  it('getItem falls back to memory on error', async () => {
    mockGet.mockRejectedValue(new Error('idb unavailable'));
    // Nothing in memory yet — should return null
    expect(await idbStorage.getItem('fallback-key')).toBeNull();
  });

  it('setItem falls back to memory on error, then getItem reads from memory', async () => {
    mockSet.mockRejectedValue(new Error('idb unavailable'));
    mockGet.mockRejectedValue(new Error('idb unavailable'));

    await idbStorage.setItem('mem-key', 'mem-value');
    const result = await idbStorage.getItem('mem-key');
    expect(result).toBe('mem-value');
  });

  it('removeItem falls back to memory delete on error', async () => {
    mockSet.mockRejectedValue(new Error('idb unavailable'));
    mockGet.mockRejectedValue(new Error('idb unavailable'));
    mockDel.mockRejectedValue(new Error('idb unavailable'));

    await idbStorage.setItem('del-key', 'val');
    await idbStorage.removeItem('del-key');
    expect(await idbStorage.getItem('del-key')).toBeNull();
  });
});
