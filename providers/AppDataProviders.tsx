"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  buildRecurringTasks,
  toDayKey,
  type SerializedRecurringEvent,
  type SerializedTask,
} from "@/lib/recurring";
import { loadAppData, saveAppData } from "@/lib/local-storage";

type AppData = {
  tasks: SerializedTask[];
  recurringEvents: SerializedRecurringEvent[];
};

type AppDataContextValue = AppData & {
  ready: boolean;
  addTask: (task: Omit<SerializedTask, "id" | "done">) => void;
  toggleTask: (taskId: string) => void;
  deleteCompletedTasksForDate: (date: string) => void;
  addRecurringEvent: (
    event: Omit<SerializedRecurringEvent, "id" | "active" | "daysCsv"> & {
      days: number[];
    }
  ) => void;
  updateRecurringEvent: (
    id: string,
    event: Omit<SerializedRecurringEvent, "id" | "active" | "daysCsv"> & {
      days: number[];
    }
  ) => void;
  deleteRecurringEvent: (id: string) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function daysToCsv(days: number[]) {
  return [...days].sort((a, b) => a - b).join(",");
}

const defaultData: AppData = {
  tasks: [],
  recurringEvents: [],
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<SerializedTask[]>([]);
  const [recurringEvents, setRecurringEvents] = useState<
    SerializedRecurringEvent[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await loadAppData();

      if (cancelled) return;

      setTasks(data.tasks ?? defaultData.tasks);
      setRecurringEvents(data.recurringEvents ?? defaultData.recurringEvents);
      setReady(true);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    void saveAppData({
      tasks,
      recurringEvents,
    });
  }, [ready, tasks, recurringEvents]);

  const value = useMemo<AppDataContextValue>(() => {
    return {
      ready,
      tasks,
      recurringEvents,

      addTask(task) {
        setTasks((current) => [
          ...current,
          {
            ...task,
            id: createId("task"),
            done: false,
          },
        ]);
      },

      toggleTask(taskId) {
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, done: !task.done } : task
          )
        );
      },

      deleteCompletedTasksForDate(date) {
        setTasks((current) =>
          current.filter((task) => !(task.date === date && task.done))
        );
      },

      addRecurringEvent(eventInput) {
        const event: SerializedRecurringEvent = {
          ...eventInput,
          id: createId("recurring"),
          active: true,
          daysCsv: daysToCsv(eventInput.days),
        };

        const generatedTasks = buildRecurringTasks(event).map((task) => ({
          ...task,
          id: createId("task"),
        }));

        setRecurringEvents((current) => [event, ...current]);
        setTasks((current) => [...current, ...generatedTasks]);
      },

      updateRecurringEvent(id, eventInput) {
        const updatedEvent: SerializedRecurringEvent = {
          ...eventInput,
          id,
          active: true,
          daysCsv: daysToCsv(eventInput.days),
        };

        const generatedTasks = buildRecurringTasks(updatedEvent).map((task) => ({
          ...task,
          id: createId("task"),
        }));

        setRecurringEvents((current) =>
          current.map((event) => (event.id === id ? updatedEvent : event))
        );

        setTasks((current) => [
          ...current.filter((task) => task.recurringEventId !== id),
          ...generatedTasks,
        ]);
      },

      deleteRecurringEvent(id) {
        setRecurringEvents((current) =>
          current.filter((event) => event.id !== id)
        );

        setTasks((current) =>
          current.filter((task) => task.recurringEventId !== id)
        );
      },
    };
  }, [ready, tasks, recurringEvents]);

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider.");
  }

  return context;
}