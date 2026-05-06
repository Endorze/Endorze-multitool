import type { Metadata } from "next";
import "./globals.css";
import { MusicProvider } from "@/providers/MusicProvider";
import { AlarmProvider } from "@/providers/AlarmProvider";
import { SoundSettingsProvider } from "@/providers/SoundSettingsProvider";

export const metadata: Metadata = {
  title: "Task Calendar",
  description:
    "Local desktop task calendar with reminders, alarms, timers, music, and utilities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MusicProvider>
          <SoundSettingsProvider>
            <AlarmProvider>{children}</AlarmProvider>
          </SoundSettingsProvider>
        </MusicProvider>
      </body>
    </html>
  );
}