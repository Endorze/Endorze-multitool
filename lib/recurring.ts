import {
  Prisma,
  RecurringEvent,
  ReminderMode,
  TaskVisibility,
  TrackingMode,
  Urgency,
} from "@prisma/client";

const GENERATION_WINDOW_DAYS = 180;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export type SerializedReminderMode = "none" | "push" | "email" | "both";
export type SerializedTaskVisibility = "public" | "private";

export type SerializedTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
  urgency: "normal" | "important" | "deadline";
  trackingMode: "checkable" | "reminder_only";
  visibility: SerializedTaskVisibility;
  reminderMode?: SerializedReminderMode;
  recurringEventId?: string;

  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  readonly?: boolean;
};

export type SerializedRecurringEvent = {
  id: string;
  title: string;
  time: string;
  urgency: "normal" | "important" | "deadline";
  trackingMode: "checkable" | "reminder_only";
  visibility: SerializedTaskVisibility;
  reminderMode?: SerializedReminderMode;
  daysCsv: string;
  startDate: string;
  active: boolean;
};

export function dayKeyToDate(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toStoredDate(dayKey: string) {
  return new Date(`${dayKey}T12:00:00.000Z`);
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseDaysCsv(daysCsv: string) {
  return new Set(
    daysCsv
      .split(",")
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6)
  );
}

export function formatDaysCsv(daysCsv: string) {
  const set = parseDaysCsv(daysCsv);

  return WEEKDAY_OPTIONS.filter((d) => set.has(d.value))
    .map((d) => d.label)
    .join(" • ");
}

export function normalizeTrackingMode(
  urgency: "normal" | "important" | "deadline",
  trackingMode?: "checkable" | "reminder_only" | ""
): TrackingMode {
  if (trackingMode === "checkable") return "CHECKABLE";
  if (trackingMode === "reminder_only") return "REMINDER_ONLY";

  return urgency === "normal" ? "REMINDER_ONLY" : "CHECKABLE";
}

export function normalizeUrgency(
  urgency: "normal" | "important" | "deadline"
): Urgency {
  if (urgency === "important") return "IMPORTANT";
  if (urgency === "deadline") return "DEADLINE";
  return "NORMAL";
}

export function normalizeReminderMode(
  reminder?: SerializedReminderMode | ""
): ReminderMode {
  if (reminder === "push") return "PUSH";
  if (reminder === "email") return "EMAIL";
  if (reminder === "both") return "BOTH";
  return "NONE";
}

export function normalizeTaskVisibility(
  visibility?: SerializedTaskVisibility | ""
): TaskVisibility {
  if (visibility === "private") return "PRIVATE";
  return "PUBLIC";
}

function serializeReminderMode(value: ReminderMode): SerializedReminderMode {
  if (value === "PUSH") return "push";
  if (value === "EMAIL") return "email";
  if (value === "BOTH") return "both";
  return "none";
}

function serializeUrgency(
  value: Urgency
): "normal" | "important" | "deadline" {
  if (value === "IMPORTANT") return "important";
  if (value === "DEADLINE") return "deadline";
  return "normal";
}

function serializeTrackingMode(
  value: TrackingMode
): "checkable" | "reminder_only" {
  if (value === "CHECKABLE") return "checkable";
  return "reminder_only";
}

function serializeTaskVisibility(
  value?: TaskVisibility | null
): SerializedTaskVisibility {
  if (value === "PRIVATE") return "private";
  return "public";
}

export function serializeTask(
  task: {
    id: string;
    title: string;
    date: Date;
    time: string | null;
    done: boolean;
    urgency: Urgency;
    trackingMode: TrackingMode;
    reminderMode: ReminderMode;
    visibility?: TaskVisibility | null;
    recurringEventId: string | null;
    userId?: string;
    user?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  },
  viewerUserId?: string
): SerializedTask {
  const ownerId = task.user?.id ?? task.userId;
  const isSharedTask = Boolean(viewerUserId && ownerId && ownerId !== viewerUserId);

  return {
    id: task.id,
    title: task.title,
    date: task.date.toISOString().slice(0, 10),
    time: task.time ?? "",
    done: task.done,
    urgency: serializeUrgency(task.urgency),
    trackingMode: serializeTrackingMode(task.trackingMode),
    visibility: serializeTaskVisibility(task.visibility),
    reminderMode: serializeReminderMode(task.reminderMode),
    recurringEventId: task.recurringEventId ?? undefined,

    ownerId,
    ownerName: task.user ? task.user.name ?? task.user.email : undefined,
    ownerEmail: task.user?.email,
    readonly: isSharedTask,
  };
}

export function serializeRecurringEvent(
  event: RecurringEvent
): SerializedRecurringEvent {
  return {
    id: event.id,
    title: event.title,
    time: event.time ?? "",
    urgency: serializeUrgency(event.urgency),
    trackingMode: serializeTrackingMode(event.trackingMode),
    visibility: serializeTaskVisibility(event.visibility),
    reminderMode: serializeReminderMode(event.reminderMode),
    daysCsv: event.daysCsv,
    startDate: event.startDate.toISOString().slice(0, 10),
    active: event.active,
  };
}

export function buildRecurringTaskRows(event: RecurringEvent) {
  const selectedDays = parseDaysCsv(event.daysCsv);
  const today = startOfToday();

  const generationStart =
    event.startDate > today ? new Date(event.startDate) : new Date(today);

  const rows: Prisma.TaskCreateManyInput[] = [];

  const cursor = new Date(
    generationStart.getFullYear(),
    generationStart.getMonth(),
    generationStart.getDate()
  );

  for (let i = 0; i < GENERATION_WINDOW_DAYS; i++) {
    if (selectedDays.has(cursor.getDay())) {
      rows.push({
        title: event.title,
        date: toStoredDate(toDayKey(cursor)),
        time: event.time,
        done: false,
        urgency: event.urgency,
        reminderMode: event.reminderMode,
        trackingMode: event.trackingMode,
        visibility: event.visibility,
        userId: event.userId,
        recurringEventId: event.id,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}