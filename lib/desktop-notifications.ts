export async function isDesktopNotificationGranted() {
  try {
    const notification = await import("@tauri-apps/plugin-notification");
    return await notification.isPermissionGranted();
  } catch {
    return false;
  }
}

export async function requestDesktopNotificationPermission() {
  try {
    const notification = await import("@tauri-apps/plugin-notification");

    let granted = await notification.isPermissionGranted();

    if (!granted) {
      const permission = await notification.requestPermission();
      granted = permission === "granted";
    }

    return granted;
  } catch {
    return false;
  }
}

export async function showDesktopNotification(title: string, body: string) {
  try {
    const notification = await import("@tauri-apps/plugin-notification");

    let granted = await notification.isPermissionGranted();

    if (!granted) {
      const permission = await notification.requestPermission();
      granted = permission === "granted";
    }

    if (!granted) return false;

    notification.sendNotification({
      title,
      body,
    });

    return true;
  } catch {
    return false;
  }
}