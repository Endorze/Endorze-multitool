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

export type SerializedReminderMode = "none" | "push";
export type SerializedTaskVisibility = "public" | "private";
export type SerializedUrgency = "normal" | "important" | "deadline";
export type SerializedTrackingMode = "checkable" | "reminder_only";

export type SerializedTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
  urgency: SerializedUrgency;
  trackingMode: SerializedTrackingMode;
  visibility?: SerializedTaskVisibility;
  reminderMode?: SerializedReminderMode;
  recurringEventId?: string;
};

export type SerializedRecurringEvent = {
  id: string;
  title: string;
  time: string;
  urgency: SerializedUrgency;
  trackingMode: SerializedTrackingMode;
  visibility?: SerializedTaskVisibility;
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

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseDaysCsv(daysCsv: string) {
  return new Set(
    daysCsv
      .split(",")
      .map(Number)
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
  );
}

export function formatDaysCsv(daysCsv: string) {
  const selectedDays = parseDaysCsv(daysCsv);

  return WEEKDAY_OPTIONS.filter((day) => selectedDays.has(day.value))
    .map((day) => day.label)
    .join(" • ");
}

export function buildRecurringTasks(
  event: SerializedRecurringEvent
): Omit<SerializedTask, "id">[] {
  const selectedDays = parseDaysCsv(event.daysCsv);
  const today = startOfToday();
  const startDate = dayKeyToDate(event.startDate);

  const generationStart = startDate > today ? startDate : today;

  const tasks: Omit<SerializedTask, "id">[] = [];

  const cursor = new Date(
    generationStart.getFullYear(),
    generationStart.getMonth(),
    generationStart.getDate()
  );

  for (let i = 0; i < GENERATION_WINDOW_DAYS; i++) {
    if (selectedDays.has(cursor.getDay())) {
      tasks.push({
        title: event.title,
        date: toDayKey(cursor),
        time: event.time,
        done: false,
        urgency: event.urgency,
        trackingMode: event.trackingMode,
        visibility: event.visibility ?? "private",
        reminderMode: event.reminderMode ?? "none",
        recurringEventId: event.id,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return tasks;
}