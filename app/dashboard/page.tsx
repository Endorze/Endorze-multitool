import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TimezoneSync } from "@/components/timezone-sync";
import DashboardWorkspace from "@/components/dashboard-workspace";
import MusicPlayerBar from "@/components/music-playerbar";
import DesktopTaskReminderRunner from "@/components/desktop-task-reminder-runner";
import AppTitlebar from "@/components/app-titlebar";
import { TabHistoryProvider } from "@/providers/TabHistoryProvider";
import {
  serializeRecurringEvent,
  serializeTask,
  type SerializedRecurringEvent,
  type SerializedTask,
} from "@/lib/recurring";
import { UsageTrackerProvider } from "@/components/usage-tracker-provider";
import { getAcceptedFriendIds } from "@/lib/friends";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      recurringEvents: {
        where: { active: true },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!user) redirect("/login");

  const friendIds = await getAcceptedFriendIds(user.id);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          userId: {
            in: friendIds,
          },
          visibility: "PUBLIC",
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const initialTasks: SerializedTask[] = tasks.map((task) =>
    serializeTask(task, user.id)
  );

  const recurringEvents: SerializedRecurringEvent[] =
    user.recurringEvents.map(serializeRecurringEvent);

  return (
    <TabHistoryProvider>
      <AppTitlebar />
      <UsageTrackerProvider>
        <TimezoneSync />
        <DesktopTaskReminderRunner />

        <main className="app-shell min-h-screen pb-28 pt-10">
          <div className="flex min-h-screen w-full flex-col px-3 py-3 lg:px-4 lg:py-4">
            <DashboardWorkspace
              userName={user.name ?? user.email ?? "User"}
              userEmail={user.email}
              initialTasks={initialTasks}
              recurringEvents={recurringEvents}
            />
          </div>
        </main>

        <MusicPlayerBar />
      </UsageTrackerProvider>
    </TabHistoryProvider>
  );
}