"use client";

import { useEffect } from "react";
import { showDesktopNotification } from "@/lib/desktop-notifications";

type UiTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
  urgency: "normal" | "important" | "deadline";
  reminderMode?: "none" | "push" | "email" | "both";
};

type ApiResponse = {
  ok: boolean;
  tasks?: UiTask[];
};

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function tomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function wantsDesktopReminder(task: UiTask) {
  return task.reminderMode === "push" || task.reminderMode === "both";
}

function minutesUntilTask(task: UiTask) {
  if (!task.time) return null;

  const due = new Date(`${task.date}T${task.time}:00`);
  const now = new Date();

  return Math.ceil((due.getTime() - now.getTime()) / 60000);
}

function alreadySent(key: string) {
  return window.localStorage.getItem(key) === "sent";
}

function markSent(key: string) {
  window.localStorage.setItem(key, "sent");
}

export default function DesktopTaskReminderRunner() {
  useEffect(() => {
    async function checkReminders() {
      try {
        const response = await fetch("/api/tasks/reminder-snapshot", {
          cache: "no-store",
        });

        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.ok || !data.tasks) return;

        const today = todayKey();
        const tomorrow = tomorrowKey();

        for (const task of data.tasks) {
          if (task.done || !wantsDesktopReminder(task)) continue;

          if (task.urgency === "deadline" && task.date === tomorrow) {
            const key = `desktop-reminder:${task.id}:deadline-tomorrow`;

            if (!alreadySent(key)) {
              const sent = await showDesktopNotification(
                "Deadline tomorrow",
                `${task.title} is due tomorrow.`
              );

              if (sent) markSent(key);
            }
          }

          if (task.urgency === "deadline" && task.date === today) {
            const key = `desktop-reminder:${task.id}:deadline-today`;

            if (!alreadySent(key)) {
              const sent = await showDesktopNotification(
                "Deadline today",
                `${task.title} is due today.`
              );

              if (sent) markSent(key);
            }
          }

          const minutesLeft = minutesUntilTask(task);

          if (minutesLeft !== null && minutesLeft <= 60 && minutesLeft >= 0) {
            const key = `desktop-reminder:${task.id}:within-one-hour`;

            if (!alreadySent(key)) {
              const sent = await showDesktopNotification(
                "Task coming up",
                `${task.title} starts in ${minutesLeft} minute${
                  minutesLeft === 1 ? "" : "s"
                }.`
              );

              if (sent) markSent(key);
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    }

    void checkReminders();

    const interval = window.setInterval(() => {
      void checkReminders();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}