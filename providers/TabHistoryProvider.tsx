"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type AppTab = "calendar" | "shared" | "timer" | "alarms" | "music";

type TitlebarOverride = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
};

type TabHistoryContextValue = {
  activeTab: AppTab;
  goToTab: (tab: AppTab) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  titlebarOverride: TitlebarOverride | null;
  setTitlebarOverride: (override: TitlebarOverride | null) => void;
};

const TabHistoryContext = createContext<TabHistoryContextValue | null>(null);

export function TabHistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<AppTab[]>(["calendar"]);
  const [index, setIndex] = useState(0);
  const [titlebarOverride, setTitlebarOverride] =
    useState<TitlebarOverride | null>(null);

  const activeTab = history[index];

  function goToTab(tab: AppTab) {
    if (tab === activeTab) return;

    setHistory((current) => {
      const trimmed = current.slice(0, index + 1);
      return [...trimmed, tab];
    });

    setIndex((current) => current + 1);
  }

  function goBack() {
    setIndex((current) => Math.max(0, current - 1));
  }

  function goForward() {
    setIndex((current) => Math.min(history.length - 1, current + 1));
  }

  const value = useMemo(
    () => ({
      activeTab,
      goToTab,
      goBack,
      goForward,
      canGoBack: titlebarOverride?.onBack ? true : index > 0,
      canGoForward: titlebarOverride ? false : index < history.length - 1,
      titlebarOverride,
      setTitlebarOverride,
    }),
    [activeTab, index, history.length, titlebarOverride]
  );

  return (
    <TabHistoryContext.Provider value={value}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  const context = useContext(TabHistoryContext);

  if (!context) {
    throw new Error("useTabHistory must be used inside TabHistoryProvider");
  }

  return context;
}