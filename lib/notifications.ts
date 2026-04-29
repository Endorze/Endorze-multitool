export async function processReminders() {
  return {
    checked: 0,
    emailsSent: 0,
    pushesSent: 0,
    disabled: true,
    reason:
      "Server reminders are disabled. Desktop reminders are handled locally by the Tauri app.",
  };
}