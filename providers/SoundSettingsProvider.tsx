"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  emptySoundSettings,
  loadSoundSettings,
  removeSoundFile,
  saveSoundFile,
  saveSoundSettings,
  type SoundSettings,
  type SoundSlot,
} from "@/lib/sound-settings";

type StartSoundOptions = {
  loop?: boolean;
};

type StopSound = () => void;

type SoundSettingsContextValue = {
  ready: boolean;
  settings: SoundSettings;
  setCustomSound: (slot: SoundSlot, file: File) => Promise<void>;
  clearCustomSound: (slot: SoundSlot) => Promise<void>;
  playSound: (slot: SoundSlot, durationMs?: number) => Promise<void>;
  startSound: (slot: SoundSlot, options?: StartSoundOptions) => Promise<StopSound>;
};

const SoundSettingsContext =
  createContext<SoundSettingsContextValue | null>(null);

function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function playFallbackBeepOnce(slot: SoundSlot) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      // @ts-expect-error browser prefix fallback
      window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    const notes =
      slot === "alarm"
        ? [880, 660, 880, 660, 880]
        : slot === "timer"
          ? [660, 880, 990]
          : [880];

    let startAt = audioContext.currentTime;

    for (const frequency of notes) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(0.001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.38);

      startAt += 0.28;
    }

    window.setTimeout(() => {
      void audioContext.close().catch(() => undefined);
    }, 2200);
  } catch {
    // ignore sound errors
  }
}

function startFallbackSound(slot: SoundSlot, loop: boolean): StopSound {
  playFallbackBeepOnce(slot);

  if (!loop) return () => undefined;

  const interval = window.setInterval(() => {
    playFallbackBeepOnce(slot);
  }, 1500);

  return () => {
    window.clearInterval(interval);
  };
}

export function SoundSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<SoundSettings>(emptySoundSettings);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const loadedSettings = await loadSoundSettings();

      if (cancelled) return;

      setSettings(loadedSettings);
      setReady(true);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveSoundSettings(settings);
  }, [ready, settings]);

  const value = useMemo<SoundSettingsContextValue>(() => {
    async function startSound(
      slot: SoundSlot,
      options: StartSoundOptions = {}
    ): Promise<StopSound> {
      const sound = settings[slot];
      const loop = Boolean(options.loop);

      if (!sound || !isTauri()) {
        return startFallbackSound(slot, loop);
      }

      try {
        const path = await import("@tauri-apps/api/path");

        const appDataDir = await path.appDataDir();
        const fullPath = await path.join(appDataDir, sound.path);

        const audio = new Audio(convertFileSrc(fullPath));
        audio.loop = loop;

        await audio.play();

        return () => {
          audio.pause();
          audio.currentTime = 0;
          audio.src = "";
          audio.load();
        };
      } catch {
        return startFallbackSound(slot, loop);
      }
    }

    async function playSound(slot: SoundSlot, durationMs = 4000) {
      const stop = await startSound(slot, { loop: false });

      window.setTimeout(() => {
        stop();
      }, durationMs);
    }

    return {
      ready,
      settings,

      async setCustomSound(slot, file) {
        const isMp3 =
          file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");

        if (!isMp3) {
          alert("Only MP3 files are allowed.");
          return;
        }

        if (!isTauri()) {
          alert("Custom sound storage only works in the Tauri desktop app.");
          return;
        }

        const previousSound = settings[slot];
        const savedSound = await saveSoundFile(slot, file);

        await removeSoundFile(previousSound);

        setSettings((current) => ({
          ...current,
          [slot]: savedSound,
        }));
      },

      async clearCustomSound(slot) {
        const previousSound = settings[slot];

        await removeSoundFile(previousSound);

        setSettings((current) => ({
          ...current,
          [slot]: null,
        }));
      },

      startSound,
      playSound,
    };
  }, [ready, settings]);

  return (
    <SoundSettingsContext.Provider value={value}>
      {children}
    </SoundSettingsContext.Provider>
  );
}

export function useSoundSettings() {
  const context = useContext(SoundSettingsContext);

  if (!context) {
    throw new Error(
      "useSoundSettings must be used inside SoundSettingsProvider."
    );
  }

  return context;
}