"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";

export type ActiveWindowInfo = {
  app_name: string;
  process_path: string;
  window_title: string;
  pid: number;
};

export type UsageStore = {
  enabled: boolean;
  days: Record<string, Record<string, number>>;
};

type UsageApp = {
  appName: string;
  seconds: number;
};

type UsageTrackerContextValue = {
  store: UsageStore;
  activeWindow: ActiveWindowInfo | null;
  activeUsageName: string | null;
  error: string | null;
  lastSavedAt: string | null;
  todayApps: UsageApp[];
  weeklyMedianApps: UsageApp[];
  toggleTracking: () => void;
  clearHistory: () => void;
};

const UsageTrackerContext = createContext<UsageTrackerContextValue | null>(null);

const STORAGE_KEY = "task-calendar-app-usage";
const POLL_SECONDS = 5;
const SAVE_SECONDS = 60;

const DEFAULT_STORE: UsageStore = {
  enabled: true,
  days: {},
};

const GENERIC_PROCESS_NAMES = new Set([
  "app",
  "game",
  "launcher",
  "client",
  "start",
  "main",
  "unityplayer",
  "unrealengine",
  "win64-shipping",
  "shipping",
]);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cloneStore(store: UsageStore): UsageStore {
  return {
    enabled: store.enabled,
    days: JSON.parse(JSON.stringify(store.days)) as Record<
      string,
      Record<string, number>
    >,
  };
}

function readStore(): UsageStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return cloneStore(DEFAULT_STORE);

    const parsed = JSON.parse(raw) as Partial<UsageStore>;

    return {
      enabled: parsed.enabled ?? true,
      days: parsed.days ?? {},
    };
  } catch {
    return cloneStore(DEFAULT_STORE);
  }
}

function writeStore(store: UsageStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function cleanWindowTitle(title: string) {
  return title
    .replace(/\s*-\s*Google Chrome$/i, "")
    .replace(/\s*-\s*Microsoft Edge$/i, "")
    .replace(/\s*-\s*Mozilla Firefox$/i, "")
    .replace(/\s*-\s*Opera$/i, "")
    .replace(/\s*-\s*Brave$/i, "")
    .replace(/\s*\|\s*.*$/i, "")
    .trim();
}

function getUsageName(info: ActiveWindowInfo) {
  const appName = info.app_name.trim() || "Unknown";
  const appNameLower = appName.toLowerCase();
  const cleanTitle = cleanWindowTitle(info.window_title);

  if (GENERIC_PROCESS_NAMES.has(appNameLower) && cleanTitle) {
    return cleanTitle;
  }

  if (appNameLower.endsWith("-win64-shipping") && cleanTitle) {
    return cleanTitle;
  }

  if (appNameLower.includes("shipping") && cleanTitle) {
    return cleanTitle;
  }

  if (appNameLower.includes("launcher") && cleanTitle) {
    return cleanTitle;
  }

  return appName;
}

function median(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle];
}

export function UsageTrackerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const memoryStoreRef = useRef<UsageStore>(cloneStore(DEFAULT_STORE));
  const [store, setStore] = useState<UsageStore>(cloneStore(DEFAULT_STORE));
  const [activeWindow, setActiveWindow] = useState<ActiveWindowInfo | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const loadedStore = readStore();

    memoryStoreRef.current = cloneStore(loadedStore);
    setStore(loadedStore);
  }, []);

  useEffect(() => {
    const saveNow = () => {
      writeStore(memoryStoreRef.current);
      setLastSavedAt(new Date().toLocaleTimeString());
    };

    window.addEventListener("beforeunload", saveNow);

    return () => {
      saveNow();
      window.removeEventListener("beforeunload", saveNow);
    };
  }, []);

  useEffect(() => {
    if (!store.enabled) return;

    let cancelled = false;

    async function tick() {
      try {
        const info = await invoke<ActiveWindowInfo>("get_active_window");

        if (cancelled) return;

        const usageName = getUsageName(info);
        const date = todayKey();
        const currentStore = memoryStoreRef.current;
        const today = currentStore.days[date] ?? {};

        const nextStore: UsageStore = {
          ...currentStore,
          enabled: true,
          days: {
            ...currentStore.days,
            [date]: {
              ...today,
              [usageName]: (today[usageName] ?? 0) + POLL_SECONDS,
            },
          },
        };

        memoryStoreRef.current = nextStore;
        setStore(cloneStore(nextStore));
        setActiveWindow(info);
        setError(null);
      } catch (err) {
        setError(String(err));
      }
    }

    function saveSnapshot() {
      writeStore(memoryStoreRef.current);
      setLastSavedAt(new Date().toLocaleTimeString());
    }

    tick();

    const trackingInterval = window.setInterval(tick, POLL_SECONDS * 1000);
    const saveInterval = window.setInterval(saveSnapshot, SAVE_SECONDS * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(trackingInterval);
      window.clearInterval(saveInterval);
      saveSnapshot();
    };
  }, [store.enabled]);

  const todayApps = useMemo(() => {
    const today = store.days[todayKey()] ?? {};

    return Object.entries(today)
      .map(([appName, seconds]) => ({
        appName,
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [store]);

  const weeklyMedianApps = useMemo(() => {
    const apps = new Map<string, number[]>();

    const last7Days = Object.entries(store.days)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7);

    last7Days.forEach(([, day]) => {
      Object.entries(day).forEach(([appName, seconds]) => {
        const current = apps.get(appName) ?? [];
        current.push(seconds);
        apps.set(appName, current);
      });
    });

    return Array.from(apps.entries())
      .map(([appName, values]) => ({
        appName,
        seconds: median(values),
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [store]);

  const activeUsageName = activeWindow ? getUsageName(activeWindow) : null;

  function toggleTracking() {
    const nextStore: UsageStore = {
      ...cloneStore(memoryStoreRef.current),
      enabled: !memoryStoreRef.current.enabled,
    };

    memoryStoreRef.current = cloneStore(nextStore);
    writeStore(nextStore);
    setStore(nextStore);
    setLastSavedAt(new Date().toLocaleTimeString());
  }

  function clearHistory() {
    const nextStore: UsageStore = {
      enabled: memoryStoreRef.current.enabled,
      days: {},
    };

    memoryStoreRef.current = cloneStore(nextStore);
    writeStore(nextStore);
    setStore(nextStore);
    setLastSavedAt(new Date().toLocaleTimeString());
  }

  const value = useMemo(
    () => ({
      store,
      activeWindow,
      activeUsageName,
      error,
      lastSavedAt,
      todayApps,
      weeklyMedianApps,
      toggleTracking,
      clearHistory,
    }),
    [store, activeWindow, activeUsageName, error, lastSavedAt, todayApps, weeklyMedianApps]
  );

  return (
    <UsageTrackerContext.Provider value={value}>
      {children}
    </UsageTrackerContext.Provider>
  );
}

export function useUsageTracker() {
  const context = useContext(UsageTrackerContext);

  if (!context) {
    throw new Error("useUsageTracker must be used inside UsageTrackerProvider");
  }

  return context;
}