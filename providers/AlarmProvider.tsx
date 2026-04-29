"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type AlarmType = "one_time" | "repeating";

export type AlarmItem = {
  id: string;
  label: string;
  time: string; // HH:mm
  type: AlarmType;
  enabled: boolean;
  days: number[];
  date?: string; // yyyy-MM-dd
  sound?: string | null;
  lastTriggeredAt?: string | null;
};

type AlarmContextValue = {
  alarms: AlarmItem[];
  addAlarm: (alarm: AlarmItem) => void;
  updateAlarm: (id: string, updater: (alarm: AlarmItem) => AlarmItem) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
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

function playDefaultAlarmSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      // @ts-expect-error browser prefix fallback
      window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    const notes = [880, 660, 880, 660];
    let startAt = audioContext.currentTime;

    for (const frequency of notes) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(0.001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + 0.38);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.4);

      startAt += 0.25;
    }

    window.setTimeout(() => {
      void audioContext.close().catch(() => undefined);
    }, 1800);
  } catch {
    // ignore sound errors
  }
}

async function showAlarmNotification(label: string, body: string) {
  try {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      new Notification(label, {
        body,
        icon: "/icon-192.png",
      });
    }
  } catch {
    // ignore notification errors
  }
}

export function AlarmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as AlarmItem[];
      if (Array.isArray(parsed)) {
        setAlarms(parsed);
      }
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
    intervalRef.current = window.setInterval(() => {
      const { dateKey, timeKey, dayOfWeek } = getNowParts();

      setAlarms((current) => {
        let changed = false;

        const next = current.map((alarm) => {
          if (!alarm.enabled) return alarm;

          const triggerKey = `${dateKey}-${timeKey}`;

          if (alarm.lastTriggeredAt === triggerKey) {
            return alarm;
          }

          if (alarm.type === "one_time") {
            if (alarm.date === dateKey && alarm.time === timeKey) {
              changed = true;

              void showAlarmNotification(
                alarm.label || "Alarm",
                `Alarm for ${alarm.time}`
              );
              playDefaultAlarmSound();

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

            void showAlarmNotification(
              alarm.label || "Repeating alarm",
              `Alarm for ${alarm.time}`
            );
            playDefaultAlarmSound();

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
      }
    };
  }, []);

  const value = useMemo<AlarmContextValue>(
    () => ({
      alarms,
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
    }),
    [alarms]
  );

  return (
    <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>
  );
}

export function useAlarms() {
  const context = useContext(AlarmContext);

  if (!context) {
    throw new Error("useAlarms must be used inside AlarmProvider");
  }

  return context;
}