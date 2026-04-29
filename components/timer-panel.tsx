"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { showDesktopNotification } from "@/lib/desktop-notifications";

function clampTimePart(value: string, max: number) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  const parsed = Number(digitsOnly);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(parsed, max));
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function secondsToParts(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return { hours, minutes, seconds };
}

function partsToSeconds(hours: string, minutes: string, seconds: string) {
  const h = Number(hours || "0");
  const m = Number(minutes || "0");
  const s = Number(seconds || "0");

  return h * 3600 + m * 60 + s;
}

function playFinishedBeep() {
  try {
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.05;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.8);

    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // ignore if audio context fails
  }
}

export default function TimerPanel() {
  const [hoursInput, setHoursInput] = useState("00");
  const [minutesInput, setMinutesInput] = useState("25");
  const [secondsInput, setSecondsInput] = useState("00");

  const [remainingSeconds, setRemainingSeconds] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const display = useMemo(() => {
    const { hours, minutes, seconds } = secondsToParts(remainingSeconds);
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }, [remainingSeconds]);

  const totalConfiguredSeconds = useMemo(() => {
    return partsToSeconds(hoursInput, minutesInput, secondsInput);
  }, [hoursInput, minutesInput, secondsInput]);

  useEffect(() => {
    if (!hasStarted) {
      setRemainingSeconds(totalConfiguredSeconds);
    }
  }, [totalConfiguredSeconds, hasStarted]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          showDesktopNotification("Timer finished", "Your timer has completed.");
          playFinishedBeep();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  function handleStart() {
    if (remainingSeconds <= 0) return;
    setHasStarted(true);
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    setHasStarted(false);
    setRemainingSeconds(totalConfiguredSeconds);
  }

  function updateHours(value: string) {
    const next = clampTimePart(value, 99);
    setHoursInput(next === "" ? "" : pad2(Number(next)));
  }

  function updateMinutes(value: string) {
    const next = clampTimePart(value, 59);
    setMinutesInput(next === "" ? "" : pad2(Number(next)));
  }

  function updateSeconds(value: string) {
    const next = clampTimePart(value, 59);
    setSecondsInput(next === "" ? "" : pad2(Number(next)));
  }

  return (
    <section className="theme-panel rounded-[32px] p-4 sm:p-6">
      <div className="mb-6">
        <p className="text-sm theme-muted">Utility tools</p>
        <h2 className="mt-1 text-2xl font-semibold">Timer</h2>
        <p className="mt-2 text-sm theme-muted">
          Set any countdown using hours, minutes, and seconds.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="theme-surface rounded-[28px] p-5">
          <p className="mb-4 text-sm theme-muted">Set duration</p>

          <div className="flex items-center justify-center gap-3">
            <div className="grid gap-2">
              <span className="text-center text-xs uppercase tracking-[0.16em] theme-faint">
                Hours
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={hoursInput}
                onChange={(event) => updateHours(event.target.value)}
                className="theme-input h-16 w-20 rounded-2xl text-center text-2xl font-semibold outline-none"
              />
            </div>

            <span className="pt-6 text-3xl font-semibold theme-faint">:</span>

            <div className="grid gap-2">
              <span className="text-center text-xs uppercase tracking-[0.16em] theme-faint">
                Minutes
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={minutesInput}
                onChange={(event) => updateMinutes(event.target.value)}
                className="theme-input h-16 w-20 rounded-2xl text-center text-2xl font-semibold outline-none"
              />
            </div>

            <span className="pt-6 text-3xl font-semibold theme-faint">:</span>

            <div className="grid gap-2">
              <span className="text-center text-xs uppercase tracking-[0.16em] theme-faint">
                Seconds
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={secondsInput}
                onChange={(event) => updateSeconds(event.target.value)}
                className="theme-input h-16 w-20 rounded-2xl text-center text-2xl font-semibold outline-none"
              />
            </div>
          </div>

          <p className="mt-4 text-center text-sm theme-faint">
            Example: 00:25:00 or 01:30:45
          </p>
        </div>

        <div className="theme-surface rounded-[28px] p-5">
          <p className="text-sm theme-muted">Countdown</p>

          <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-6 py-8 text-center">
            <div className="text-5xl font-semibold tracking-tight sm:text-6xl">
              {display}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={isRunning || remainingSeconds <= 0}
              className="rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start
            </button>

            <button
              type="button"
              onClick={handlePause}
              disabled={!isRunning}
              className="theme-button-soft rounded-2xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pause
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="theme-button-soft rounded-2xl px-5 py-3 text-sm font-medium transition"
            >
              Reset
            </button>
          </div>

          <p className="mt-4 text-sm theme-muted">
            When the timer finishes, it plays a local beep in the browser.
          </p>
        </div>
      </div>
    </section>
  );
}