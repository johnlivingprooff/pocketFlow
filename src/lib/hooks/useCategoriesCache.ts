import { useEffect, useRef, useCallback } from 'react';
import { getCategories, getCategoriesHierarchy, Category } from '../db/categories';
import { log } from '../../utils/logger';

/**
 * In-memory cache for categories to avoid repeated database queries
 * Categories are relatively static, so caching them significantly improves performance
 */
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Global cache object - persists across component re-renders
const categoriesCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache lifetime (categories change infrequently)

/**
 * Get cache key based on parameters
 */
function getCacheKey(type?: 'income' | 'expense', isHierarchy: boolean = false): string {
  return `${isHierarchy ? 'hierarchy' : 'flat'}_${type || 'all'}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Hook to efficiently load and cache categories
 * Eliminates repeated database queries for the same category data
 */
export function useCategories(type?: 'income' | 'expense') {
  const cacheKey = getCacheKey(type, false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadCategories = useCallback(async (): Promise<Category[]> => {
    const startTime = Date.now();

    // Check if we have valid cached data
    const cachedEntry = categoriesCache.get(cacheKey);
    if (isCacheValid(cachedEntry)) {
      log(`[Cache] Using cached categories (${type || 'all'}) - ${Date.now() - startTime}ms`);
      return cachedEntry!.data;
    }

    try {
      // Fetch fresh data from database
      const categories = await getCategories(type);

      // Store in cache
      categoriesCache.set(cacheKey, {
        data: categories,
        timestamp: Date.now(),
      });

      const loadTime = Date.now() - startTime;
      log(`[Cache] Loaded categories from DB (${type || 'all'}) - ${loadTime}ms`);

      if (isMountedRef.current) {
        return categories;
      }
      return [];
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  }, [cacheKey, type]);

  return { loadCategories };
}

/**
 * Hook to efficiently load and cache category hierarchy
 * Used when you need parent-child relationships
 */
export function useCategoriesHierarchy(type?: 'income' | 'expense') {
  const cacheKey = getCacheKey(type, true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadCategoriesHierarchy = useCallback(
    async (): Promise<Array<{ category: Category; children: Category[] }>> => {
      const startTime = Date.now();

      // Check if we have valid cached data
      const cachedEntry = categoriesCache.get(cacheKey);
      if (isCacheValid(cachedEntry)) {
        log(`[Cache] Using cached category hierarchy (${type || 'all'}) - ${Date.now() - startTime}ms`);
        return cachedEntry!.data;
      }

      try {
        // Fetch fresh data from database
        const hierarchy = await getCategoriesHierarchy(type);

        // Store in cache
        categoriesCache.set(cacheKey, {
          data: hierarchy,
          timestamp: Date.now(),
        });

        const loadTime = Date.now() - startTime;
        log(`[Cache] Loaded category hierarchy from DB (${type || 'all'}) - ${loadTime}ms`);

        if (isMountedRef.current) {
          return hierarchy;
        }
        return [];
      } catch (error) {
        console.error('Error loading category hierarchy:', error);
        return [];
      }
    },
    [cacheKey, type]
  );

  return { loadCategoriesHierarchy };
}

/**
 * Invalidate all category caches
 * Call this after creating/updating/deleting a category
 */
export function invalidateCategoriesCache(): void {
  categoriesCache.clear();
  log('[Cache] Invalidated all category caches');
}

/**
 * Invalidate specific category cache
 */
export function invalidateCategoryCacheForType(type?: 'income' | 'expense'): void {
  categoriesCache.delete(getCacheKey(type, false));
  categoriesCache.delete(getCacheKey(type, true));
  log(`[Cache] Invalidated category cache for type: ${type || 'all'}`);
}
