"use client";

import { ArrowLeft, ArrowRight, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTabHistory } from "@/providers/TabHistoryProvider";

export default function AppTitlebar() {
  const {
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    titlebarOverride,
  } = useTabHistory();

  async function minimize() {
    await getCurrentWindow().minimize();
  }

  async function maximize() {
    await getCurrentWindow().toggleMaximize();
  }

  async function close() {
    await getCurrentWindow().close();
  }

  function handleBack() {
    if (titlebarOverride?.onBack) {
      titlebarOverride.onBack();
      return;
    }

    goBack();
  }

  return (
    <div
      data-tauri-drag-region
      className="app-titlebar fixed left-0 right-0 top-0 z-[100] flex h-10 items-center justify-between border-b border-[var(--line)] px-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={!canGoBack}
          className="app-nav-btn shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={goForward}
          disabled={!canGoForward}
          className="app-nav-btn shrink-0"
          aria-label="Forward"
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        <div
          data-tauri-drag-region
          className="ml-2 flex min-w-0 items-center gap-2 text-sm font-medium theme-muted"
        >
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-300/20 text-cyan-700 dark:text-cyan-100">
            ♪
          </div>

          <span className="truncate">
            {titlebarOverride?.title ?? "Task Calendar"}
          </span>

          {titlebarOverride?.subtitle ? (
            <span className="hidden shrink-0 text-xs opacity-70 sm:inline">
              / {titlebarOverride.subtitle}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {titlebarOverride?.onClose ? (
          <button
            type="button"
            onClick={titlebarOverride.onClose}
            className="app-window-btn"
            aria-label="Close tool"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <button type="button" onClick={minimize} className="app-window-btn">
          <Minus className="h-4 w-4" />
        </button>

        <button type="button" onClick={maximize} className="app-window-btn">
          <Square className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={close}
          className="app-window-btn app-window-btn-close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}