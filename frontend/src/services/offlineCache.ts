type CachedRecord<T> = {
  value: T;
  cachedAt: string;
};

const CACHE_PREFIX = "truesight:offline-cache:";

export const getOfflineCacheKey = (scope: string, key: string) =>
  `${CACHE_PREFIX}${scope}:${key}`;

export const readOfflineCache = <T,>(scope: string, key: string): T | null => {
  try {
    const raw = localStorage.getItem(getOfflineCacheKey(scope, key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedRecord<T>;
    return parsed.value;
  } catch {
    return null;
  }
};

export const writeOfflineCache = <T,>(
  scope: string,
  key: string,
  value: T,
) => {
  try {
    const record: CachedRecord<T> = {
      value,
      cachedAt: new Date().toISOString(),
    };

    localStorage.setItem(getOfflineCacheKey(scope, key), JSON.stringify(record));
  } catch {
    // Browsers can reject writes when storage is full or private mode is strict.
  }
};

export const hasOfflineCache = (scope: string, key: string) =>
  readOfflineCache<unknown>(scope, key) !== null;
