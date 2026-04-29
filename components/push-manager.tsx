"use client";

import { useEffect, useState } from "react";
import {
  isDesktopNotificationGranted,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from "@/lib/desktop-notifications";

type PushManagerCardProps = {
  variant?: "card" | "settings";
};

export function PushManagerCard({ variant = "card" }: PushManagerCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    isDesktopNotificationGranted()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, []);

  async function enablePush() {
    const granted = await requestDesktopNotificationPermission();

    setEnabled(granted);
    setStatus(
      granted
        ? "Desktop notifications enabled."
        : "Could not enable desktop notifications."
    );
  }

  async function sendLocalTest() {
    const sent = await showDesktopNotification(
      "Desktop notification test",
      "If you can see this, Tauri notifications are working."
    );

    setStatus(
      sent ? "Desktop notification sent." : "Could not send desktop notification."
    );
  }

  const content = (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm theme-muted">Reminders</p>
          <h2 className="mt-1 text-2xl font-semibold">
            Desktop notifications
          </h2>
          <p className="mt-2 max-w-2xl text-sm theme-muted">
            Enable local desktop notifications for timers, alarms, and reminders.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={enablePush}
            disabled={enabled}
            className="theme-button-soft rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enabled ? "Notifications enabled" : "Enable notifications"}
          </button>

          <button
            type="button"
            onClick={sendLocalTest}
            className="theme-button-accent rounded-2xl px-4 py-3 text-sm font-medium transition"
          >
            Send test
          </button>
        </div>
      </div>

      {status ? (
        <div className="mt-4 rounded-2xl theme-card px-4 py-3 text-sm theme-muted">
          {status}
        </div>
      ) : null}
    </>
  );

  if (variant === "settings") {
    return <section className="theme-surface rounded-[28px] p-5">{content}</section>;
  }

  return <section className="theme-panel rounded-[28px] p-5">{content}</section>;
}