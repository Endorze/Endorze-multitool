import type {
  SerializedRecurringEvent,
  SerializedTask,
} from "@/lib/recurring";

type StoredAppData = {
  tasks: SerializedTask[];
  recurringEvents: SerializedRecurringEvent[];
};

const STORAGE_FILE = "task-calendar-data.json";
const BROWSER_STORAGE_KEY = "task-calendar-data";

const emptyData: StoredAppData = {
  tasks: [],
  recurringEvents: [],
};

function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadAppData(): Promise<StoredAppData> {
  try {
    if (isTauri()) {
      const fs = await import("@tauri-apps/plugin-fs");

      const text = await fs.readTextFile(STORAGE_FILE, {
        baseDir: fs.BaseDirectory.AppData,
      });

      return {
        ...emptyData,
        ...JSON.parse(text),
      };
    }

    const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
    return raw ? { ...emptyData, ...JSON.parse(raw) } : emptyData;
  } catch (error) {
    console.warn("Could not load app data:", error);
    return emptyData;
  }
}

export async function saveAppData(data: StoredAppData) {
  try {
    if (isTauri()) {
      const fs = await import("@tauri-apps/plugin-fs");

      await fs.mkdir("", {
        baseDir: fs.BaseDirectory.AppData,
        recursive: true,
      });

      await fs.writeTextFile(STORAGE_FILE, JSON.stringify(data, null, 2), {
        baseDir: fs.BaseDirectory.AppData,
      });

      return;
    }

    window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save app data:", error);
  }
}