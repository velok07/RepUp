const STORAGE_KEY = "repup-state";
const LEGACY_STORAGE_KEYS = ["vk-6weeks-state"] as const;

export function loadState<T>() {
  try {
    const nextRaw = localStorage.getItem(STORAGE_KEY);
    if (nextRaw) {
      return JSON.parse(nextRaw) as T;
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;

      const parsed = JSON.parse(legacyRaw) as T;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveState<T>(state: T) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode issues
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // ignore storage issues
  }
}
