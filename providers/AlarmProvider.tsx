"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSoundSettings } from "@/providers/SoundSettingsProvider";
import { showDesktopNotification } from "@/lib/desktop-notifications";

export type AlarmType = "one_time" | "repeating";

export type AlarmItem = {
  id: string;
  label: string;
  time: string;
  type: AlarmType;
  enabled: boolean;
  days: number[];
  date?: string;
  sound?: string | null;
  lastTriggeredAt?: string | null;
};

type ActiveAlarm = {
  alarmId: string;
  label: string;
  time: string;
};

type AlarmContextValue = {
  alarms: AlarmItem[];
  activeAlarm: ActiveAlarm | null;
  addAlarm: (alarm: AlarmItem) => void;
  updateAlarm: (id: string, updater: (alarm: AlarmItem) => AlarmItem) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  dismissActiveAlarm: () => void;
  snoozeActiveAlarm: () => void;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

const STORAGE_KEY = "task-calendar-alarms";

function getNowParts() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const hh = `${now.getHours()}`.padStart(2, "0");
  const min = `${now.getMinutes()}`.padStart(2, "0");

  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    timeKey: `${hh}:${min}`,
    dayOfWeek: now.getDay(),
  };
}

function addMinutesToNow(minutes: number) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);

  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const { startSound } = useSoundSettings();

  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);

  const intervalRef = useRef<number | null>(null);
  const stopSoundRefs = useRef<Array<() => void>>([]);
  const firingKeysRef = useRef<Set<string>>(new Set());
  const activeAlarmRef = useRef<ActiveAlarm | null>(null);
  const startSoundRef = useRef(startSound);

  useEffect(() => {
    startSoundRef.current = startSound;
  }, [startSound]);

  useEffect(() => {
    activeAlarmRef.current = activeAlarm;
  }, [activeAlarm]);

  function stopAllAlarmSounds() {
    for (const stop of stopSoundRefs.current) {
      try {
        stop();
      } catch {
        // ignore stop errors
      }
    }

    stopSoundRefs.current = [];
  }

  async function fireAlarm(alarm: AlarmItem, triggerKey: string) {
    const lockKey = `${alarm.id}:${triggerKey}`;

    if (firingKeysRef.current.has(lockKey)) return;

    firingKeysRef.current.add(lockKey);

    stopAllAlarmSounds();

    const nextActiveAlarm = {
      alarmId: alarm.id,
      label: alarm.label || "Alarm",
      time: alarm.time,
    };

    activeAlarmRef.current = nextActiveAlarm;
    setActiveAlarm(nextActiveAlarm);

    void showDesktopNotification(
      alarm.label || "Alarm",
      `Alarm for ${alarm.time}`
    );

    const stop = await startSoundRef.current("alarm", { loop: true });
    stopSoundRefs.current.push(stop);
  }

  function dismissActiveAlarm() {
    stopAllAlarmSounds();
    activeAlarmRef.current = null;
    setActiveAlarm(null);
  }

  function snoozeActiveAlarm() {
    const currentAlarm = activeAlarmRef.current;
    if (!currentAlarm) return;

    const snoozeTime = addMinutesToNow(5);

    stopAllAlarmSounds();

    setAlarms((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: `${currentAlarm.label} (snoozed)`,
        date: snoozeTime.date,
        time: snoozeTime.time,
        type: "one_time",
        enabled: true,
        days: [],
        sound: null,
        lastTriggeredAt: null,
      },
    ]);

    activeAlarmRef.current = null;
    setActiveAlarm(null);
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as AlarmItem[];
      if (Array.isArray(parsed)) setAlarms(parsed);
    } catch {
      // ignore bad storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
    } catch {
      // ignore storage errors
    }
  }, [alarms]);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      const { dateKey, timeKey, dayOfWeek } = getNowParts();
      const triggerKey = `${dateKey}-${timeKey}`;

      setAlarms((current) => {
        let changed = false;

        const next = current.map((alarm) => {
          if (!alarm.enabled) return alarm;
          if (alarm.lastTriggeredAt === triggerKey) return alarm;

          if (alarm.type === "one_time") {
            if (alarm.date === dateKey && alarm.time === timeKey) {
              changed = true;
              void fireAlarm(alarm, triggerKey);

              return {
                ...alarm,
                enabled: false,
                lastTriggeredAt: triggerKey,
              };
            }

            return alarm;
          }

          const shouldFireToday =
            alarm.days.includes(dayOfWeek) && alarm.time === timeKey;

          if (shouldFireToday) {
            changed = true;
            void fireAlarm(alarm, triggerKey);

            return {
              ...alarm,
              lastTriggeredAt: triggerKey,
            };
          }

          return alarm;
        });

        return changed ? next : current;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      stopAllAlarmSounds();
    };
  }, []);

  const value = useMemo<AlarmContextValue>(
    () => ({
      alarms,
      activeAlarm,
      addAlarm: (alarm) => {
        setAlarms((current) => [...current, alarm]);
      },
      updateAlarm: (id, updater) => {
        setAlarms((current) =>
          current.map((alarm) => (alarm.id === id ? updater(alarm) : alarm))
        );
      },
      deleteAlarm: (id) => {
        setAlarms((current) => current.filter((alarm) => alarm.id !== id));
      },
      toggleAlarm: (id) => {
        setAlarms((current) =>
          current.map((alarm) =>
            alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
          )
        );
      },
      dismissActiveAlarm,
      snoozeActiveAlarm,
    }),
    [alarms, activeAlarm]
  );

  return (
    <AlarmContext.Provider value={value}>
      {children}

      {activeAlarm ? (
        <div className="fixed bottom-24 right-5 z-[130] w-[min(420px,calc(100vw-2.5rem))]">
          <div className="theme-panel rounded-[28px] border border-[var(--line)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="mb-4">
              <p className="text-sm theme-muted">Alarm</p>
              <h3 className="mt-1 truncate text-xl font-semibold">
                {activeAlarm.label}
              </h3>
              <p className="mt-2 text-sm theme-muted">
                Alarm scheduled for {activeAlarm.time}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={snoozeActiveAlarm}
                className="theme-button-soft rounded-2xl px-5 py-3 text-sm font-medium"
              >
                Snooze 5 min
              </button>

              <button
                type="button"
                onClick={dismissActiveAlarm}
                className="rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
              >
                Turn off alarm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AlarmContext.Provider>
  );
}

export function useAlarms() {
  const context = useContext(AlarmContext);

  if (!context) {
    throw new Error("useAlarms must be used inside AlarmProvider");
  }

  return context;
}