import AppTitlebar from "@/components/app-titlebar";
import DashboardWorkspace from "@/components/dashboard-workspace";
import DesktopTaskReminderRunner from "@/components/desktop-task-reminder-runner";
import MusicPlayerBar from "@/components/music-playerbar";
import { UsageTrackerProvider } from "@/components/usage-tracker-provider";
import { AppDataProvider } from "@/providers/AppDataProviders";
import { TabHistoryProvider } from "@/providers/TabHistoryProvider";

export default function DashboardPage() {
  return (
    <TabHistoryProvider>
      <AppDataProvider>
        <AppTitlebar />

        <UsageTrackerProvider>
          <DesktopTaskReminderRunner />

          <main className="app-shell min-h-screen pb-28 pt-10">
            <div className="flex min-h-screen w-full flex-col px-3 py-3 lg:px-4 lg:py-4">
              <DashboardWorkspace />
            </div>
          </main>

          <MusicPlayerBar />
        </UsageTrackerProvider>
      </AppDataProvider>
    </TabHistoryProvider>
  );
}