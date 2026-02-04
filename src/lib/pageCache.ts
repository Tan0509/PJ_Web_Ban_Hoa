/**
 * Client-side cache với TTL (dùng cho home, category, product – chỉ xem).
 * Không dùng cho checkout, thanh toán, badge.
 */

const CACHE = new Map<string, { value: unknown; expiresAt: number }>();

const TTL_MS = 30 * 60 * 1000; // 30 phút

export function getPageCache<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setPageCache(key: string, value: unknown, ttlMs: number = TTL_MS): void {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearPageCacheKey(key: string): void {
  CACHE.delete(key);
}
