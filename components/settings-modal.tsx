"use client";

import { useRef, useState } from "react";
import {
  BellRing,
  HardDrive,
  Music2,
  Play,
  RotateCcw,
  Settings,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { PushManagerCard } from "@/components/push-manager";
import { useSoundSettings } from "@/providers/SoundSettingsProvider";
import type { SoundSlot } from "@/lib/sound-settings";

type SettingsSection = "notifications" | "sounds" | "storage" | "about";

function SidebarButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
        active ? "theme-button-accent" : "hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SoundPicker({
  slot,
  title,
  description,
}: {
  slot: SoundSlot;
  title: string;
  description: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { settings, setCustomSound, clearCustomSound, playSound } =
    useSoundSettings();

  const sound = settings[slot];

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    await setCustomSound(slot, file);
    event.target.value = "";
  }

  return (
    <section className="theme-surface rounded-[28px] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold">{title}</h4>
          <p className="mt-2 text-sm leading-6 theme-muted">{description}</p>
          <p className="mt-3 truncate text-sm theme-faint">
            Current: {sound ? sound.name : "Built-in fallback sound"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="theme-button-accent inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          >
            <Upload className="h-4 w-4" />
            Upload MP3
          </button>

          <button
            type="button"
            onClick={() => playSound(slot)}
            className="theme-button-soft inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          >
            <Play className="h-4 w-4" />
            Preview
          </button>

          <button
            type="button"
            onClick={() => clearCustomSound(slot)}
            disabled={!sound}
            className="theme-button-soft inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,.mp3"
            hidden
            onChange={handleUpload}
          />
        </div>
      </div>
    </section>
  );
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>("notifications");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6">
      <div className="theme-panel flex h-[min(760px,92vh)] w-full max-w-5xl overflow-hidden rounded-[32px]">
        <aside className="w-72 shrink-0 border-r border-[var(--line)] bg-[var(--panel-soft)] p-4">
          <div className="mb-5 flex items-center gap-3 px-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl theme-card">
              <Settings className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm theme-muted">Multi-tool</p>
              <h2 className="font-semibold">Settings</h2>
            </div>
          </div>

          <div className="grid gap-2">
            <SidebarButton
              active={section === "notifications"}
              onClick={() => setSection("notifications")}
              icon={<BellRing className="h-4 w-4" />}
            >
              Notifications
            </SidebarButton>

            <SidebarButton
              active={section === "sounds"}
              onClick={() => setSection("sounds")}
              icon={<Volume2 className="h-4 w-4" />}
            >
              Sounds
            </SidebarButton>

            <SidebarButton
              active={section === "storage"}
              onClick={() => setSection("storage")}
              icon={<HardDrive className="h-4 w-4" />}
            >
              Storage
            </SidebarButton>

            <SidebarButton
              active={section === "about"}
              onClick={() => setSection("about")}
              icon={<Music2 className="h-4 w-4" />}
            >
              About
            </SidebarButton>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm theme-muted">Preferences</p>
              <h3 className="text-2xl font-semibold">
                {section === "notifications" ? "Notifications" : null}
                {section === "sounds" ? "Sounds" : null}
                {section === "storage" ? "Storage" : null}
                {section === "about" ? "About" : null}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="theme-button-soft grid h-11 w-11 place-items-center rounded-2xl"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {section === "notifications" ? (
            <PushManagerCard variant="settings" />
          ) : null}

          {section === "sounds" ? (
            <div className="grid gap-4">
              <SoundPicker
                slot="task"
                title="Task notification sound"
                description="Plays when a task reminder fires."
              />

              <SoundPicker
                slot="alarm"
                title="Alarm sound"
                description="Plays when one-time or repeating alarms fire."
              />

              <SoundPicker
                slot="timer"
                title="Timer finished sound"
                description="Plays when the countdown timer reaches zero."
              />
            </div>
          ) : null}

          {section === "storage" ? (
            <div className="grid gap-4">
              <section className="theme-surface rounded-[28px] p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl theme-card">
                    <HardDrive className="h-5 w-5" />
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold">
                      Local desktop storage
                    </h4>
                    <p className="mt-2 text-sm leading-6 theme-muted">
                      Tasks, music, alarms, and custom sounds are stored locally
                      in the app data folder.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {section === "about" ? (
            <div className="grid gap-4">
              <section className="theme-surface rounded-[28px] p-5">
                <h4 className="text-lg font-semibold">Task Calendar</h4>
                <p className="mt-2 text-sm leading-6 theme-muted">
                  Desktop utility for planner tasks, reminders, alarms, timers,
                  and local music.
                </p>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}