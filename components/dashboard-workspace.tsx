"use client";

import { useState } from "react";
import { useTabHistory } from "@/providers/TabHistoryProvider";
import {
  BellRing,
  CalendarDays,
  Clock3,
  Music2,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import PlannerDashboard from "@/components/planner-dashboard";
import TimerPanel from "@/components/timer-panel";
import MusicTab from "@/components/music-tab";
import AlarmPanel from "@/components/alarm-panel";
import SettingsModal from "@/components/settings-modal";
import ToolsPanel from "@/components/tools-panel";
import SharedCalendarsPanel from "@/components/shared-calendars-panel";

type UiUrgency = "normal" | "important" | "deadline";
type UiReminderChannel = "push" | "none";
type UiTrackingMode = "checkable" | "reminder_only";
type UiTaskVisibility = "public" | "private";

type UiTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
  urgency: UiUrgency;
  trackingMode: UiTrackingMode;
  visibility?: UiTaskVisibility;
  reminderMode?: UiReminderChannel;
  reminderChannel?: UiReminderChannel;
  recurringEventId?: string;

  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  readonly?: boolean;
};

type UiRecurringEvent = {
  id: string;
  title: string;
  time: string;
  urgency: UiUrgency;
  trackingMode: UiTrackingMode;
  visibility?: UiTaskVisibility;
  reminderMode?: UiReminderChannel;
  reminderChannel?: UiReminderChannel;
  daysCsv: string;
  startDate: string;
  active: boolean;
};

type DashboardWorkspaceProps = {
  userName: string;
  userEmail: string;
  initialTasks: UiTask[];
  recurringEvents: UiRecurringEvent[];
};

function TabButton({
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
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
        active ? "theme-button-accent" : "theme-button-soft"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export default function DashboardWorkspace({
  userName,
  userEmail,
  initialTasks,
  recurringEvents,
}: DashboardWorkspaceProps) {
  const { activeTab, goToTab } = useTabHistory();
  const [showSettings, setShowSettings] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-1 flex-col gap-5">
        <section className="theme-panel rounded-[28px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm theme-muted">Desktop workspace</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {userName}
              </h1>
              <p className="mt-1 truncate text-sm theme-muted">{userEmail}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TabButton
                active={activeTab === "calendar"}
                onClick={() => goToTab("calendar")}
                icon={<CalendarDays className="h-4 w-4" />}
              >
                Calendar
              </TabButton>

              <TabButton
                active={activeTab === "shared"}
                onClick={() => goToTab("shared")}
                icon={<Users className="h-4 w-4" />}
              >
                Shared calendars
              </TabButton>

              <TabButton
                active={activeTab === "timer"}
                onClick={() => goToTab("timer")}
                icon={<Clock3 className="h-4 w-4" />}
              >
                Timer
              </TabButton>

              <TabButton
                active={activeTab === "alarms"}
                onClick={() => goToTab("alarms")}
                icon={<BellRing className="h-4 w-4" />}
              >
                Alarms
              </TabButton>

              <TabButton
                active={activeTab === "music"}
                onClick={() => goToTab("music")}
                icon={<Music2 className="h-4 w-4" />}
              >
                Music
              </TabButton>

              <button
                type="button"
                onClick={() => setToolsOpen(true)}
                className="theme-button-soft grid h-12 w-12 place-items-center rounded-2xl transition"
                aria-label="Open tools"
                title="Tools"
              >
                <Wrench className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="theme-button-soft grid h-12 w-12 place-items-center rounded-2xl transition"
                aria-label="Open settings"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {activeTab === "calendar" ? (
          <PlannerDashboard
            userName={userName}
            userEmail={userEmail}
            initialTasks={initialTasks}
            recurringEvents={recurringEvents}
          />
        ) : null}

        {activeTab === "shared" ? <SharedCalendarsPanel /> : null}

        {activeTab === "timer" ? <TimerPanel /> : null}

        {activeTab === "alarms" ? <AlarmPanel /> : null}

        {activeTab === "music" ? <MusicTab /> : null}
      </div>

      {toolsOpen ? <ToolsPanel onClose={() => setToolsOpen(false)} /> : null}

      {showSettings ? (
        <SettingsModal onClose={() => setShowSettings(false)} />
      ) : null}
    </>
  );
}