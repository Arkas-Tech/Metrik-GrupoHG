"use client";

/**
 * Lightweight in-memory data cache for API responses.
 *
 * - Lives only in JS module scope (cleared on page reload / new deploy)
 * - No localStorage/sessionStorage/IndexedDB — zero cache-clearing needed on deploy
 * - Stale-while-revalidate: returns cached data instantly, refreshes in background
 * - Deduplicates concurrent requests for the same key
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  // Track the request that populated this entry for invalidation
  url: string;
}

// Module-level cache — persists across React navigation, cleared on full page reload
const cache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

// Default TTL: 2 minutes (data is fresh for 2min, then background-refreshed)
const DEFAULT_TTL_MS = 2 * 60 * 1000;

/**
 * Get cached data if available and not expired.
 */
export function getCached<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > ttlMs) return null;

  return entry.data as T;
}

/**
 * Get cached data even if stale (for stale-while-revalidate pattern).
 */
export function getStale<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

/**
 * Check if cached data is still fresh.
 */
export function isFresh(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

/**
 * Store data in cache.
 */
export function setCache<T>(key: string, data: T, url: string = ""): void {
  cache.set(key, { data, timestamp: Date.now(), url });
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache keys that match a prefix.
 * Use after mutations (create/update/delete) to force refresh.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear entire cache. Called on logout.
 */
export function clearAllCache(): void {
  cache.clear();
  inflightRequests.clear();
}

/**
 * Deduplicate concurrent requests.
 * If a request for the same key is already in-flight, return the existing promise.
 */
export function deduplicateRequest<T>(
  key: string,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetchFn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}
