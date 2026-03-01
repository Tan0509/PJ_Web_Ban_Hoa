type CacheEntry = { expiresAt: number; data: unknown };

const HOME_CACHE = new Map<string, CacheEntry>();
const CATEGORY_PRODUCTS_CACHE = new Map<string, CacheEntry>();

export function getHomeCache(key: string) {
  return HOME_CACHE.get(key);
}

export function setHomeCache(key: string, entry: CacheEntry) {
  HOME_CACHE.set(key, entry);
}

export function getCategoryProductsCache(key: string) {
  return CATEGORY_PRODUCTS_CACHE.get(key);
}

export function setCategoryProductsCache(key: string, entry: CacheEntry) {
  CATEGORY_PRODUCTS_CACHE.set(key, entry);
}

export function clearHomeApiCaches() {
  HOME_CACHE.clear();
  CATEGORY_PRODUCTS_CACHE.clear();
}
