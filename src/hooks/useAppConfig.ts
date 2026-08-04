'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { AppConfig } from '@/lib/types';

const CONFIG_KEY = 'stackmap_config';
const DEFAULT_CONFIG: AppConfig = { techFreedomAvailable: true };

/**
 * Cached snapshot.
 *
 * useSyncExternalStore compares snapshots by identity, so parsing the stored
 * JSON on every call would hand it a new object each time and loop forever.
 * The cache is invalidated whenever the stored text changes.
 */
let cachedRaw: string | null = null;
let cachedConfig: AppConfig = DEFAULT_CONFIG;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing the config counts as a change here too
  window.addEventListener('storage', notify);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', notify);
  };
}

function getSnapshot(): AppConfig {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CONFIG_KEY);
  } catch {
    // Storage unavailable (private browsing, blocked cookies) — use the default
    return DEFAULT_CONFIG;
  }

  if (raw === cachedRaw) return cachedConfig;

  cachedRaw = raw;
  if (raw === null) {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }

  try {
    cachedConfig = { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AppConfig>) };
  } catch {
    cachedConfig = DEFAULT_CONFIG;
  }
  return cachedConfig;
}

/** The server has no storage, so it always renders the default. */
function getServerSnapshot(): AppConfig {
  return DEFAULT_CONFIG;
}

export function useAppConfig() {
  const config = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    const next = { ...getSnapshot(), ...updates };
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do if it will not persist; the change still applies below
    }
    cachedRaw = JSON.stringify(next);
    cachedConfig = next;
    notify();
  }, []);

  return { config, updateConfig };
}
