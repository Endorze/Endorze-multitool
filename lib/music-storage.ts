import type { Track } from "@/hooks/useMusicPlayer";

const MUSIC_LIBRARY_FILE = "music-library.json";
const BROWSER_STORAGE_KEY = "music-library";

function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadMusicLibrary(): Promise<Track[]> {
  try {
    if (isTauri()) {
      const fs = await import("@tauri-apps/plugin-fs");

      const text = await fs.readTextFile(MUSIC_LIBRARY_FILE, {
        baseDir: fs.BaseDirectory.AppData,
      });

      return JSON.parse(text) as Track[];
    }

    const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Track[]) : [];
  } catch {
    return [];
  }
}

export async function saveMusicLibrary(tracks: Track[]) {
  try {
    if (isTauri()) {
      const fs = await import("@tauri-apps/plugin-fs");

      await fs.mkdir("", {
        baseDir: fs.BaseDirectory.AppData,
        recursive: true,
      });

      await fs.writeTextFile(MUSIC_LIBRARY_FILE, JSON.stringify(tracks, null, 2), {
        baseDir: fs.BaseDirectory.AppData,
      });

      return;
    }

    window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(tracks));
  } catch (error) {
    console.error("Could not save music library:", error);
  }
}