"use client";

import { useEffect, useRef } from "react";
import { Activity, Pause, Play, Trash2 } from "lucide-react";
import { useTabHistory } from "@/providers/TabHistoryProvider";
import { useUsageTracker } from "@/components/usage-tracker-provider";

const SECONDS_PER_DAY = 24 * 60 * 60;

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function getProcessFileName(path: string) {
  const normalized = path.replaceAll("\\", "/");
  return normalized.split("/").pop() || path || "Unknown";
}

function UsageBar({
  label,
  seconds,
  maxSeconds,
}: {
  label: string;
  seconds: number;
  maxSeconds: number;
}) {
  const percentOfMax = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0;
  const percentOfDay = (seconds / SECONDS_PER_DAY) * 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>

        <span className="theme-muted">
          {formatSeconds(seconds)} · {percentOfDay.toFixed(1)}% of day
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{ width: `${Math.max(4, Math.round(percentOfMax))}%` }}
        />
      </div>
    </div>
  );
}

export default function DiagnosticsTool({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const onBackRef = useRef(onBack);
  const onCloseRef = useRef(onClose);
  const { setTitlebarOverride } = useTabHistory();

  const {
    store,
    activeWindow,
    activeUsageName,
    error,
    lastSavedAt,
    todayApps,
    weeklyMedianApps,
    toggleTracking,
    clearHistory,
  } = useUsageTracker();

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setTitlebarOverride({
      title: "Diagnostics",
      subtitle: "App usage tracking",
      onBack: () => onBackRef.current(),
      onClose: () => onCloseRef.current(),
    });

    return () => setTitlebarOverride(null);
  }, [setTitlebarOverride]);

  return (
    <div className="fixed left-0 right-0 top-10 bottom-0 z-[90] overflow-hidden bg-slate-100 dark:bg-slate-950">
      <main className="flex h-full min-h-0 flex-col overflow-hidden">
        <section className="shrink-0 border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Diagnostics</h2>
              <p className="mt-1 text-sm theme-muted">
                Tracks the active focused app locally on this device.
              </p>

              <p className="mt-1 text-xs theme-muted">
                Tracking is {store.enabled ? "enabled" : "disabled"}. Data saves
                automatically.
                {lastSavedAt ? ` Last saved: ${lastSavedAt}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleTracking}
                className="theme-button-accent inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
              >
                {store.enabled ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {store.enabled ? "Disable tracking" : "Enable tracking"}
              </button>

              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-2 border border-rose-300/20 bg-rose-300/10 px-5 py-3 text-sm font-medium text-rose-700 dark:text-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                Clear history
              </button>
            </div>
          </div>
        </section>

        <section className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 xl:grid-cols-[1fr_1fr]">
          <div className="theme-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center theme-card">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm theme-muted">Current active app</p>
                <h3 className="text-lg font-semibold">
                  {activeUsageName ?? "Waiting for active window..."}
                </h3>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Tracked as:</span>{" "}
                {activeUsageName ?? "-"}
              </p>

              <p>
                <span className="font-semibold">Process:</span>{" "}
                {activeWindow?.app_name ?? "-"}
              </p>

              <p>
                <span className="font-semibold">Executable:</span>{" "}
                {activeWindow?.process_path
                  ? getProcessFileName(activeWindow.process_path)
                  : "-"}
              </p>

              <p>
                <span className="font-semibold">Window:</span>{" "}
                {activeWindow?.window_title || "Unknown"}
              </p>

              <p>
                <span className="font-semibold">PID:</span>{" "}
                {activeWindow?.pid ?? "-"}
              </p>

              <p className="break-all">
                <span className="font-semibold">Path:</span>{" "}
                {activeWindow?.process_path || "-"}
              </p>

              {error ? <p className="text-rose-500">Error: {error}</p> : null}
            </div>
          </div>

          <div className="theme-panel p-5">
            <h3 className="mb-4 text-lg font-semibold">Today</h3>

            <div className="space-y-3">
              {todayApps.length === 0 ? (
                <p className="text-sm theme-muted">
                  No usage tracked today yet.
                </p>
              ) : (
                todayApps.map((app) => (
                  <UsageBar
                    key={app.appName}
                    label={app.appName}
                    seconds={app.seconds}
                    maxSeconds={todayApps[0]?.seconds ?? 1}
                  />
                ))
              )}
            </div>
          </div>

          <div className="theme-panel p-5 xl:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">
              Weekly median daily usage
            </h3>

            <div className="space-y-3">
              {weeklyMedianApps.length === 0 ? (
                <p className="text-sm theme-muted">
                  Weekly median appears after tracking some apps.
                </p>
              ) : (
                weeklyMedianApps.map((app) => (
                  <UsageBar
                    key={app.appName}
                    label={app.appName}
                    seconds={app.seconds}
                    maxSeconds={weeklyMedianApps[0]?.seconds ?? 1}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}