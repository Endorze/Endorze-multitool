"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  formatDaysCsv,
  toDayKey,
  type SerializedRecurringEvent,
  type SerializedTask,
  type SerializedReminderMode,
  type SerializedTrackingMode,
  type SerializedUrgency,
} from "@/lib/recurring";
import { useAppData } from "@/providers/AppDataProviders";

const weekdayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

function fromDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isPastDay(date: Date) {
  return date < startOfToday();
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getUrgencyClasses(urgency: SerializedUrgency) {
  if (urgency === "deadline") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  }

  if (urgency === "important") {
    return "border-amber-400/25 bg-amber-400/12 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
  }

  return "border-indigo-400/20 bg-indigo-400/10 text-indigo-700 dark:border-indigo-300/15 dark:bg-indigo-300/10 dark:text-indigo-100";
}

function getTrackingLabel(trackingMode: SerializedTrackingMode) {
  return trackingMode === "checkable" ? "Checkable" : "Reminder only";
}

function getReminderLabel(reminderMode?: SerializedReminderMode) {
  return reminderMode === "push" ? "Desktop reminder" : "No reminder";
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition ${done
          ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-500 dark:text-emerald-200"
          : "theme-card theme-muted"
        }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function BellDot() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-700 dark:text-cyan-100">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    </span>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </svg>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="theme-panel w-full max-w-2xl rounded-[28px] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="theme-button-soft rounded-2xl px-3 py-2 text-sm transition"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  busyTaskId,
  onToggle,
}: {
  task: SerializedTask;
  busyTaskId: string | null;
  onToggle: (taskId: string) => void;
}) {
  const canToggle = task.trackingMode === "checkable";

  return (
    <button
      type="button"
      onClick={() => {
        if (!canToggle) return;
        onToggle(task.id);
      }}
      disabled={busyTaskId === task.id || !canToggle}
      className={`w-full rounded-[24px] border p-4 text-left transition disabled:opacity-100 ${canToggle ? "" : "cursor-default"
        }`}
      style={{
        background: "var(--panel-soft)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-start gap-3">
        {task.trackingMode === "checkable" ? (
          <CheckIcon done={task.done} />
        ) : (
          <BellDot />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p
                className={`truncate text-base font-semibold ${task.done ? "line-through opacity-40" : ""
                  }`}
              >
                {task.title}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${getUrgencyClasses(
                    task.urgency
                  )}`}
                >
                  {task.urgency}
                </span>

                <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                  {getTrackingLabel(task.trackingMode)}
                </span>

                <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                  {getReminderLabel(task.reminderMode)}
                </span>

                {task.time ? (
                  <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                    {task.time}
                  </span>
                ) : null}

                {task.recurringEventId ? (
                  <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-100">
                    Recurring
                  </span>
                ) : null}
              </div>
            </div>

            <div className="text-xs uppercase tracking-[0.16em] theme-faint">
              {task.trackingMode === "checkable"
                ? task.done
                  ? "Completed"
                  : "Tap to complete"
                : "Reminder only"}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function PlannerDashboard() {
  const appData = useAppData();

  const {
    ready,
    tasks,
    recurringEvents,
    addTask,
    toggleTask,
    deleteCompletedTasksForDate,
    addRecurringEvent,
    updateRecurringEvent,
    deleteRecurringEvent,
  } = appData;

  const today = useMemo(() => startOfToday(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<SerializedUrgency>("normal");
  const [time, setTime] = useState("");
  const [reminderMode, setReminderMode] =
    useState<SerializedReminderMode>("none");
  const [trackingMode, setTrackingMode] =
    useState<SerializedTrackingMode>("reminder_only");

  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [showRecurringCreateModal, setShowRecurringCreateModal] =
    useState(false);
  const [showRecurringManageModal, setShowRecurringManageModal] =
    useState(false);

  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringUrgency, setRecurringUrgency] =
    useState<SerializedUrgency>("normal");
  const [recurringTime, setRecurringTime] = useState("");
  const [recurringReminderMode, setRecurringReminderMode] =
    useState<SerializedReminderMode>("none");
  const [recurringTrackingMode, setRecurringTrackingMode] =
    useState<SerializedTrackingMode>("reminder_only");
  const [recurringDays, setRecurringDays] = useState<number[]>([1]);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(
    null
  );

  const selectedDayKey = toDayKey(selectedDate);
  const selectedDateIsPast = isPastDay(selectedDate);

  const completedCount = tasks.filter((task: SerializedTask) => task.done).length;
  const openCount = tasks.length - completedCount;

  const datesWithTasks = useMemo(() => {
  const dayKeys = tasks.map((task: SerializedTask) => task.date);
  return [...new Set<string>(dayKeys)].map(fromDayKey);
}, [tasks]);

  const tasksForSelectedDate = useMemo(() => {
    return tasks
      .filter((task: SerializedTask) => task.date === selectedDayKey)
      .sort((a: SerializedTask, b: SerializedTask) => {
        if (a.done !== b.done) return Number(a.done) - Number(b.done);
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [tasks, selectedDayKey]);

  function dayHasTasks(date: Date) {
    const key = toDayKey(date);
    return tasks.some((task: SerializedTask) => task.date === key);
  }

  function handleAddTask() {
    const cleanTitle = title.trim();

    if (!cleanTitle || selectedDateIsPast) return;

    addTask({
      title: cleanTitle,
      date: selectedDayKey,
      time,
      urgency,
      reminderMode,
      trackingMode,
      visibility: "private",
    });

    setTitle("");
    setUrgency("normal");
    setTime("");
    setReminderMode("none");
    setTrackingMode("reminder_only");
    setStatus("");
  }

  function handleToggleTask(taskId: string) {
    if (busyTaskId) return;

    const task = tasks.find((item: SerializedTask) => item.id === taskId);

    if (!task || task.trackingMode !== "checkable") return;

    setBusyTaskId(taskId);
    toggleTask(taskId);
    setBusyTaskId(null);
  }

  function toggleRecurringDay(day: number) {
    setRecurringDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  }

  function openCreateRecurringModal() {
    setEditingRecurringId(null);
    setRecurringTitle("");
    setRecurringUrgency("normal");
    setRecurringTime("");
    setRecurringReminderMode("none");
    setRecurringTrackingMode("reminder_only");
    setRecurringDays([1]);
    setShowRecurringCreateModal(true);
  }

  function openEditRecurringModal(event: SerializedRecurringEvent) {
    setEditingRecurringId(event.id);
    setRecurringTitle(event.title);
    setRecurringUrgency(event.urgency);
    setRecurringTime(event.time);
    setRecurringReminderMode(event.reminderMode ?? "none");
    setRecurringTrackingMode(event.trackingMode);
    setRecurringDays(
      event.daysCsv
        .split(",")
        .map(Number)
        .filter((value) => !Number.isNaN(value))
    );
    setShowRecurringCreateModal(true);
  }

  function submitRecurringEvent() {
    const cleanTitle = recurringTitle.trim();

    if (!cleanTitle || recurringDays.length === 0) {
      setStatus("Recurring events need a title and at least one weekday.");
      return;
    }

    const payload = {
      title: cleanTitle,
      time: recurringTime,
      urgency: recurringUrgency,
      reminderMode: recurringReminderMode,
      trackingMode: recurringTrackingMode,
      visibility: "private" as const,
      days: recurringDays,
      startDate: selectedDayKey,
    };

    if (editingRecurringId) {
      updateRecurringEvent(editingRecurringId, payload);
    } else {
      addRecurringEvent(payload);
    }

    setShowRecurringCreateModal(false);
    setStatus("");
  }

  function deleteCompletedForSelectedDay() {
    deleteCompletedTasksForDate(selectedDayKey);
    setStatus("");
  }

  if (!ready) {
    return (
      <section className="theme-panel rounded-[28px] p-5">
        <p className="text-sm theme-muted">Loading local app data...</p>
      </section>
    );
  }

  return (
    <>
      <section className="theme-panel rounded-[28px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm theme-muted">Welcome back</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Local Planner
            </h1>
            <p className="mt-2 text-sm theme-muted">
              Stored locally on this device
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="theme-card rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] theme-faint">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold">{tasks.length}</p>
            </div>
            <div className="theme-card rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] theme-faint">
                Open
              </p>
              <p className="mt-2 text-2xl font-semibold">{openCount}</p>
            </div>
            <div className="theme-card rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] theme-faint">
                Done
              </p>
              <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid items-start gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="theme-panel h-fit rounded-[32px] p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm theme-muted">Planner view</p>
              <h2 className="mt-1 text-2xl font-semibold">Monthly calendar</h2>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full theme-pill px-3 py-2 text-sm theme-muted">
              <CalendarIcon />
              Local tasks
            </div>
          </div>

          <div className="theme-surface rounded-[28px] p-3 sm:p-4">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(date);
              }}
              showOutsideDays
              disabled={(date) => isPastDay(date) && !dayHasTasks(date)}
              modifiers={{
                hasTasks: datesWithTasks,
              }}
              modifiersClassNames={{
                hasTasks: "has-task-day",
              }}
              className="planner-day-picker"
              classNames={{
                months: "flex justify-center",
                month: "w-full",
                month_caption: "mb-4 flex items-center justify-between px-2",
                caption_label: "text-lg font-semibold",
                nav: "flex items-center gap-2",
                button_previous:
                  "grid h-10 w-10 place-items-center rounded-2xl theme-button-soft transition",
                button_next:
                  "grid h-10 w-10 place-items-center rounded-2xl theme-button-soft transition",
                weekdays: "mb-2 grid grid-cols-7",
                weekday:
                  "text-center text-xs font-medium uppercase tracking-[0.16em] theme-faint",
                week: "mt-2 grid grid-cols-7",
                day: "flex justify-center",
                day_button:
                  "planner-day-button relative h-14 w-14 rounded-2xl text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10 sm:h-16 sm:w-16",
                selected:
                  "!bg-indigo-500/25 ring-1 ring-inset ring-indigo-300/35",
                today:
                  "ring-1 ring-inset ring-emerald-300/30 bg-emerald-400/8",
                outside: "opacity-30",
                disabled: "opacity-25",
              }}
            />
          </div>

          <p className="mt-4 text-sm theme-faint">
            Past dates stay viewable if they already contain tasks. Past empty
            dates remain unavailable.
          </p>
        </div>

        <div className="theme-panel h-fit rounded-[32px] p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm theme-muted">Selected date</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {formatLongDate(selectedDate)}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[340px] xl:grid-cols-1">
              <button
                type="button"
                onClick={openCreateRecurringModal}
                className="theme-button-accent rounded-2xl px-4 py-3 text-sm font-medium transition"
              >
                Add recurring event
              </button>

              <button
                type="button"
                onClick={() => setShowRecurringManageModal(true)}
                className="theme-button-soft rounded-2xl px-4 py-3 text-sm font-medium transition"
              >
                Manage recurring
              </button>
            </div>
          </div>

          <div className="theme-surface rounded-[28px] p-4">
            <div className="grid gap-4">
              <div className="flex gap-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    selectedDateIsPast
                      ? "Past dates are read-only"
                      : "Write what to do..."
                  }
                  disabled={selectedDateIsPast}
                  className="theme-input h-14 min-w-0 flex-1 rounded-2xl px-4 outline-none focus:border-indigo-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={selectedDateIsPast}
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Add task"
                >
                  <PlusIcon />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-2">
                <label className="grid min-w-0 gap-2">
                  <span className="text-sm theme-muted">Urgency</span>
                  <select
                    value={urgency}
                    onChange={(event) =>
                      setUrgency(event.target.value as SerializedUrgency)
                    }
                    disabled={selectedDateIsPast}
                    className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm theme-muted">Time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    disabled={selectedDateIsPast}
                    className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm theme-muted">Reminder</span>
                  <select
                    value={reminderMode}
                    onChange={(event) =>
                      setReminderMode(
                        event.target.value as SerializedReminderMode
                      )
                    }
                    disabled={selectedDateIsPast}
                    className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="none">No reminder</option>
                    <option value="push">Desktop reminder</option>
                  </select>
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm theme-muted">Tracking</span>
                  <select
                    value={trackingMode}
                    onChange={(event) =>
                      setTrackingMode(
                        event.target.value as SerializedTrackingMode
                      )
                    }
                    disabled={selectedDateIsPast}
                    className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="reminder_only">Reminder only</option>
                    <option value="checkable">Checkable</option>
                  </select>
                </label>
              </div>

              {selectedDateIsPast ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
                  This past day is view-only. You can still review what was
                  planned here.
                </div>
              ) : null}

              {status ? (
                <div className="theme-card rounded-2xl px-4 py-3 text-sm theme-muted">
                  {status}
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              {tasksForSelectedDate.some((task: SerializedTask) => task.done) ? (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={deleteCompletedForSelectedDay}
                    className="theme-button-soft rounded-2xl px-4 py-3 text-sm font-medium transition"
                  >
                    Delete completed
                  </button>
                </div>
              ) : null}

              {tasksForSelectedDate.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-6 py-12 text-center">
                  <p className="text-lg font-medium">
                    Nothing planned for {formatShortDate(selectedDate)}
                  </p>
                  <p className="mt-2 text-sm theme-muted">
                    Add a one-time task or create a recurring event.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasksForSelectedDate.map((task: SerializedTask) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      busyTaskId={busyTaskId}
                      onToggle={handleToggleTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showRecurringCreateModal ? (
        <Modal
          title={
            editingRecurringId ? "Edit recurring event" : "Add recurring event"
          }
          onClose={() => setShowRecurringCreateModal(false)}
        >
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm theme-muted">Task name</span>
              <input
                value={recurringTitle}
                onChange={(event) => setRecurringTitle(event.target.value)}
                placeholder="Take insulin"
                className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-sm theme-muted">Urgency</span>
                <select
                  value={recurringUrgency}
                  onChange={(event) =>
                    setRecurringUrgency(
                      event.target.value as SerializedUrgency
                    )
                  }
                  className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="deadline">Deadline</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm theme-muted">Time</span>
                <input
                  type="time"
                  value={recurringTime}
                  onChange={(event) => setRecurringTime(event.target.value)}
                  className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm theme-muted">Reminder</span>
                <select
                  value={recurringReminderMode}
                  onChange={(event) =>
                    setRecurringReminderMode(
                      event.target.value as SerializedReminderMode
                    )
                  }
                  className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30"
                >
                  <option value="none">No reminder</option>
                  <option value="push">Desktop reminder</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm theme-muted">Tracking</span>
                <select
                  value={recurringTrackingMode}
                  onChange={(event) =>
                    setRecurringTrackingMode(
                      event.target.value as SerializedTrackingMode
                    )
                  }
                  className="theme-input h-12 rounded-2xl px-4 outline-none focus:border-indigo-300/30"
                >
                  <option value="reminder_only">Reminder only</option>
                  <option value="checkable">Checkable</option>
                </select>
              </label>
            </div>

            <div>
              <p className="mb-3 text-sm theme-muted">Repeat on</p>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((day) => {
                  const selected = recurringDays.includes(day.value);

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleRecurringDay(day.value)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${selected
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

            <div className="theme-card rounded-2xl px-4 py-3 text-sm theme-muted">
              This will create linked task occurrences from{" "}
              <strong>{formatShortDate(selectedDate)}</strong> forward.
              Deleting the recurring event removes those linked tasks.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitRecurringEvent}
                className="rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                {editingRecurringId ? "Save changes" : "Create recurring event"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {showRecurringManageModal ? (
        <Modal
          title="Manage recurring events"
          onClose={() => setShowRecurringManageModal(false)}
        >
          {recurringEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-6 py-10 text-center theme-muted">
              No recurring events yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recurringEvents.map((event: SerializedRecurringEvent) => (
                <div
                  key={event.id}
                  className="rounded-[24px] border p-4"
                  style={{
                    background: "var(--panel-soft)",
                    borderColor: "var(--line)",
                  }}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold">{event.title}</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${getUrgencyClasses(
                            event.urgency
                          )}`}
                        >
                          {event.urgency}
                        </span>

                        <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                          {getTrackingLabel(event.trackingMode)}
                        </span>

                        <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                          {getReminderLabel(event.reminderMode)}
                        </span>

                        {event.time ? (
                          <span className="inline-flex items-center rounded-full theme-pill px-3 py-1 text-xs theme-muted">
                            {event.time}
                          </span>
                        ) : null}

                        <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-100">
                          {formatDaysCsv(event.daysCsv)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => openEditRecurringModal(event)}
                        className="theme-button-soft rounded-2xl px-4 py-3 text-sm font-medium transition"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteRecurringEvent(event.id)}
                        className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-300/15 dark:text-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}