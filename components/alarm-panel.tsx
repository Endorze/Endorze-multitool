"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  BellRing,
  CalendarClock,
  Clock3,
  Plus,
  Repeat,
  Trash2,
  Volume2,
} from "lucide-react";
import { type AlarmItem, useAlarms } from "@/providers/AlarmProvider";

const weekdayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

function formatAlarmDays(days: number[]) {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.join(",") === "1,2,3,4,5") return "Weekdays";
  return weekdayOptions
    .filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(" • ");
}

function formatAlarmType(type: AlarmItem["type"]) {
  return type === "one_time" ? "One time" : "Repeating";
}

export default function AlarmPanel() {
  const { alarms, addAlarm, deleteAlarm, toggleAlarm } = useAlarms();

  const todayKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const [oneTimeLabel, setOneTimeLabel] = useState("");
  const [oneTimeDate, setOneTimeDate] = useState(todayKey);
  const [oneTimeTime, setOneTimeTime] = useState("07:00");

  const [repeatLabel, setRepeatLabel] = useState("");
  const [repeatTime, setRepeatTime] = useState("07:00");
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]);

  function toggleRepeatDay(day: number) {
    setRepeatDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  }

  function createOneTimeAlarm() {
    const cleanLabel = oneTimeLabel.trim();

    if (!cleanLabel || !oneTimeDate || !oneTimeTime) return;

    addAlarm({
      id: crypto.randomUUID(),
      label: cleanLabel,
      date: oneTimeDate,
      time: oneTimeTime,
      type: "one_time",
      enabled: true,
      days: [],
      sound: null,
      lastTriggeredAt: null,
    });

    setOneTimeLabel("");
    setOneTimeDate(todayKey);
    setOneTimeTime("07:00");
  }

  function createRepeatingAlarm() {
    const cleanLabel = repeatLabel.trim();

    if (!cleanLabel || !repeatTime || repeatDays.length === 0) return;

    addAlarm({
      id: crypto.randomUUID(),
      label: cleanLabel,
      time: repeatTime,
      type: "repeating",
      enabled: true,
      days: repeatDays,
      sound: null,
      lastTriggeredAt: null,
    });

    setRepeatLabel("");
    setRepeatTime("07:00");
    setRepeatDays([1, 2, 3, 4, 5]);
  }

  return (
    <section className="grid gap-4">
      <section className="music-hero theme-panel rounded-[32px] p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm theme-muted">Utility</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              Alarms
            </h2>
            <p className="mt-2 max-w-2xl text-sm theme-muted">
              Build alarms separately from planner tasks so they feel like a real
              desktop utility. One-time alarms and repeating weekday alarms live
              here.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm theme-muted">
            Desktop-ready alarm workspace
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <section className="theme-panel rounded-[32px] p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <AlarmClock className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm theme-muted">Create</p>
                <h3 className="mt-1 text-xl font-semibold">One-time alarm</h3>
                <p className="mt-1 text-sm theme-muted">
                  Good for tomorrow morning, a meeting reminder, or a one-off
                  wake-up alarm.
                </p>
              </div>
            </div>

            <div className="theme-surface rounded-[28px] p-4">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm theme-muted">Label</span>
                  <input
                    value={oneTimeLabel}
                    onChange={(event) => setOneTimeLabel(event.target.value)}
                    placeholder="Wake up, gym, appointment..."
                    className="theme-input h-12 rounded-2xl px-4 outline-none"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm theme-muted">Date</span>
                    <input
                      type="date"
                      value={oneTimeDate}
                      min={todayKey}
                      onChange={(event) => setOneTimeDate(event.target.value)}
                      className="theme-input h-12 rounded-2xl px-4 outline-none"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm theme-muted">Time</span>
                    <input
                      type="time"
                      value={oneTimeTime}
                      onChange={(event) => setOneTimeTime(event.target.value)}
                      className="theme-input h-12 rounded-2xl px-4 outline-none"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={createOneTimeAlarm}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
                  >
                    <Plus className="h-4 w-4" />
                    Add one-time alarm
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="theme-panel rounded-[32px] p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Repeat className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm theme-muted">Create</p>
                <h3 className="mt-1 text-xl font-semibold">Repeating alarm</h3>
                <p className="mt-1 text-sm theme-muted">
                  Perfect for weekday wake-ups, medication reminders, or regular
                  routines.
                </p>
              </div>
            </div>

            <div className="theme-surface rounded-[28px] p-4">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm theme-muted">Label</span>
                  <input
                    value={repeatLabel}
                    onChange={(event) => setRepeatLabel(event.target.value)}
                    placeholder="Morning alarm, take medicine..."
                    className="theme-input h-12 rounded-2xl px-4 outline-none"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm theme-muted">Time</span>
                  <input
                    type="time"
                    value={repeatTime}
                    onChange={(event) => setRepeatTime(event.target.value)}
                    className="theme-input h-12 rounded-2xl px-4 outline-none"
                  />
                </label>

                <div>
                  <p className="mb-3 text-sm theme-muted">Repeat on</p>
                  <div className="flex flex-wrap gap-2">
                    {weekdayOptions.map((day) => {
                      const selected = repeatDays.includes(day.value);

                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleRepeatDay(day.value)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                            selected
                              ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-700 dark:text-cyan-100"
                              : "theme-button-soft"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={createRepeatingAlarm}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    <Plus className="h-4 w-4" />
                    Add repeating alarm
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4">
          <section className="theme-panel rounded-[32px] p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <BellRing className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm theme-muted">Active list</p>
                <h3 className="mt-1 text-xl font-semibold">Your alarms</h3>
                <p className="mt-1 text-sm theme-muted">
                  These alarms now fire locally in the app with a default sound
                  fallback and browser notification.
                </p>
              </div>
            </div>

            <div className="theme-surface rounded-[28px] p-3">
              {alarms.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-6 py-14 text-center">
                  <p className="text-lg font-medium">No alarms yet</p>
                  <p className="mt-2 text-sm theme-muted">
                    Create your first one-time or repeating alarm on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                          {alarm.type === "one_time" ? (
                            <CalendarClock className="h-5 w-5" />
                          ) : (
                            <Repeat className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold">
                                {alarm.label}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                                  {formatAlarmType(alarm.type)}
                                </span>

                                <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                                  {alarm.time}
                                </span>

                                {alarm.type === "one_time" && alarm.date ? (
                                  <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                                    {alarm.date}
                                  </span>
                                ) : null}

                                {alarm.type === "repeating" ? (
                                  <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-100">
                                    {formatAlarmDays(alarm.days)}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleAlarm(alarm.id)}
                                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                                  alarm.enabled
                                    ? "theme-button-accent"
                                    : "theme-button-soft"
                                }`}
                              >
                                {alarm.enabled ? "Enabled" : "Disabled"}
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteAlarm(alarm.id)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-300/15 dark:text-rose-100"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="theme-panel rounded-[32px] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <article className="theme-surface rounded-[26px] p-5">
                <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <Volume2 className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold">Default sound live</h4>
                <p className="mt-2 text-sm theme-muted">
                  Alarms now use a built-in fallback tone. Next step is letting
                  the user pick a custom sound from local MP3 files.
                </p>
              </article>

              <article className="theme-surface rounded-[26px] p-5">
                <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <Clock3 className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold">Desktop wrapping next</h4>
                <p className="mt-2 text-sm theme-muted">
                  This logic is good enough for now in-browser, and becomes much
                  stronger once the app is wrapped into desktop form.
                </p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}