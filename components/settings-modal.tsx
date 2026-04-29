"use client";

import { useState } from "react";
import {
  BellRing,
  HardDrive,
  Music2,
  Settings,
  Volume2,
  X,
} from "lucide-react";
import { PushManagerCard } from "@/components/push-manager";

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

          {section === "notifications" ? <PushManagerCard variant="settings" /> : null}

          {section === "sounds" ? (
            <div className="grid gap-4">
              <section className="theme-surface rounded-[28px] p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl theme-card">
                    <Volume2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold">Sound settings</h4>
                    <p className="mt-2 text-sm leading-6 theme-muted">
                      Next step: add custom MP3 selection for alarm sounds,
                      notification sounds, and timer-finished sounds.
                    </p>
                  </div>
                </div>
              </section>

              <section className="theme-surface rounded-[28px] p-5">
                <h4 className="font-semibold">Planned behavior</h4>
                <p className="mt-2 text-sm leading-6 theme-muted">
                  Notifications should play a short sound. Alarms should keep
                  playing until dismissed or snoozed. Timer completion should use
                  its own finish sound.
                </p>
              </section>
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
                    <h4 className="text-lg font-semibold">Local desktop storage</h4>
                    <p className="mt-2 text-sm leading-6 theme-muted">
                      Music and alarm files should eventually be copied into the
                      app data folder so they survive app restarts.
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