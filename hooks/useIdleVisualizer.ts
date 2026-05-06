"use client";

import { useEffect, useRef, useState } from "react";

type UseIdleVisualizerOptions = {
  enabled: boolean;
  idleMs?: number;
  exitOnActivity?: boolean;
};

export function useIdleVisualizer({
  enabled,
  idleMs = 60_000,
  exitOnActivity = true,
}: UseIdleVisualizerOptions) {
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);

  useEffect(() => {
    isIdleRef.current = isIdle;
  }, [isIdle]);

  useEffect(() => {
    if (!enabled) {
      setIsIdle(false);
      isIdleRef.current = false;
      return;
    }

    let timeoutId: number | null = null;

    function clearIdleTimer() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function startIdleTimer() {
      clearIdleTimer();

      timeoutId = window.setTimeout(() => {
        setIsIdle(true);
        isIdleRef.current = true;
      }, idleMs);
    }

    function handleActivity() {
      if (isIdleRef.current && !exitOnActivity) {
        return;
      }

      setIsIdle(false);
      isIdleRef.current = false;
      startIdleTimer();
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
      "touchstart",
    ];

    for (const eventName of events) {
      window.addEventListener(eventName, handleActivity);
    }

    startIdleTimer();

    return () => {
      clearIdleTimer();

      for (const eventName of events) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [enabled, idleMs, exitOnActivity]);

  function exitIdle() {
    setIsIdle(false);
    isIdleRef.current = false;
  }

  return {
    isIdle,
    exitIdle,
  };
}