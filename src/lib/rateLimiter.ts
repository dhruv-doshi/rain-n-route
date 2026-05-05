interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  { limit = 60, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let win = store.get(key);

  if (!win || now >= win.resetAt) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }

  win.count += 1;
  const allowed = win.count <= limit;
  const remaining = Math.max(0, limit - win.count);

  // Prevent unbounded growth — evict expired entries periodically
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }

  return { allowed, remaining, resetAt: win.resetAt };
}
