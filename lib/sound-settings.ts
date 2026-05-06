export type SoundSlot = "task" | "alarm" | "timer";

export type StoredSound = {
  name: string;
  path: string;
};

export type SoundSettings = {
  task: StoredSound | null;
  alarm: StoredSound | null;
  timer: StoredSound | null;
};

const SOUND_SETTINGS_FILE = "sound-settings.json";

export const emptySoundSettings: SoundSettings = {
  task: null,
  alarm: null,
  timer: null,
};

function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadSoundSettings(): Promise<SoundSettings> {
  try {
    if (!isTauri()) return emptySoundSettings;

    const fs = await import("@tauri-apps/plugin-fs");

    const text = await fs.readTextFile(SOUND_SETTINGS_FILE, {
      baseDir: fs.BaseDirectory.AppData,
    });

    return {
      ...emptySoundSettings,
      ...JSON.parse(text),
    };
  } catch {
    return emptySoundSettings;
  }
}

export async function saveSoundSettings(settings: SoundSettings) {
  try {
    if (!isTauri()) return;

    const fs = await import("@tauri-apps/plugin-fs");

    await fs.mkdir("", {
      baseDir: fs.BaseDirectory.AppData,
      recursive: true,
    });

    await fs.writeTextFile(SOUND_SETTINGS_FILE, JSON.stringify(settings, null, 2), {
      baseDir: fs.BaseDirectory.AppData,
    });
  } catch (error) {
    console.error("Could not save sound settings:", error);
  }
}

export async function saveSoundFile(slot: SoundSlot, file: File): Promise<StoredSound> {
  const fs = await import("@tauri-apps/plugin-fs");

  await fs.mkdir("sounds", {
    baseDir: fs.BaseDirectory.AppData,
    recursive: true,
  });

  const safeFileName = file.name.replace(/[^\w.-]/g, "_");
  const storedFileName = `${slot}-${crypto.randomUUID()}-${safeFileName}`;
  const storedPath = `sounds/${storedFileName}`;

  const contents = new Uint8Array(await file.arrayBuffer());

  await fs.writeFile(storedPath, contents, {
    baseDir: fs.BaseDirectory.AppData,
  });

  return {
    name: file.name.replace(/\.mp3$/i, ""),
    path: storedPath,
  };
}

export async function removeSoundFile(sound: StoredSound | null) {
  if (!sound || !isTauri()) return;

  try {
    const fs = await import("@tauri-apps/plugin-fs");

    await fs.remove(sound.path, {
      baseDir: fs.BaseDirectory.AppData,
    });
  } catch {
    // If removing fails, still allow settings to update.
  }
}