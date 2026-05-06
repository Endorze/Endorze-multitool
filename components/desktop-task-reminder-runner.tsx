"use client";

import { useEffect } from "react";
import { showDesktopNotification } from "@/lib/desktop-notifications";
import { useAppData } from "@/providers/AppDataProviders";
import { useSoundSettings } from "@/providers/SoundSettingsProvider";
import type { SerializedTask } from "@/lib/recurring";

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

function wantsDesktopReminder(task: SerializedTask) {
  return task.reminderMode === "push";
}

function minutesUntilTask(task: SerializedTask) {
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
  const { ready, tasks } = useAppData();
  const { playSound } = useSoundSettings();

  useEffect(() => {
    if (!ready) return;

    async function sendTaskReminder(
      key: string,
      title: string,
      body: string
    ) {
      if (alreadySent(key)) return;

      const sent = await showDesktopNotification(title, body);
      await playSound("task");

      if (sent) markSent(key);
    }

    async function checkReminders() {
      const today = todayKey();
      const tomorrow = tomorrowKey();

      for (const task of tasks) {
        if (task.done || !wantsDesktopReminder(task)) continue;

        if (task.urgency === "deadline" && task.date === tomorrow) {
          await sendTaskReminder(
            `desktop-reminder:${task.id}:deadline-tomorrow`,
            "Deadline tomorrow",
            `${task.title} is due tomorrow.`
          );
        }

        if (task.urgency === "deadline" && task.date === today) {
          await sendTaskReminder(
            `desktop-reminder:${task.id}:deadline-today`,
            "Deadline today",
            `${task.title} is due today.`
          );
        }

        const minutesLeft = minutesUntilTask(task);

        if (minutesLeft !== null && minutesLeft <= 60 && minutesLeft >= 0) {
          await sendTaskReminder(
            `desktop-reminder:${task.id}:within-one-hour`,
            "Task coming up",
            `${task.title} starts in ${minutesLeft} minute${
              minutesLeft === 1 ? "" : "s"
            }.`
          );
        }
      }
    }

    void checkReminders();

    const interval = window.setInterval(() => {
      void checkReminders();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [ready, tasks, playSound]);

  return null;
}