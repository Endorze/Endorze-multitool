import type { Metadata } from "next";
import "./globals.css";
import { MusicProvider } from "@/providers/MusicProvider";
import { AlarmProvider } from "@/providers/AlarmProvider";

export const metadata: Metadata = {
  title: "Task Calendar Prototype",
  description:
    "Modern task calendar with Google login, reminders, alarms, music, and push notifications.",
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
          <AlarmProvider>{children}</AlarmProvider>
        </MusicProvider>
      </body>
    </html>
  );
}