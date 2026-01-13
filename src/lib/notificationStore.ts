// Simple localStorage-based store for dismissed notifications

const DISMISSED_KEY = "dismissed-notifications";

export function getDismissedNotifications(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Also store the date they were dismissed to auto-clear old ones
      const now = Date.now();
      const validEntries = Object.entries(parsed)
        .filter(([_, timestamp]) => {
          // Keep for 30 days
          return now - (timestamp as number) < 30 * 24 * 60 * 60 * 1000;
        })
        .map(([id]) => id);
      return new Set(validEntries);
    }
  } catch (e) {
    console.error("Failed to load dismissed notifications", e);
  }
  return new Set();
}

export function dismissNotification(id: string): void {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[id] = Date.now();
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error("Failed to dismiss notification", e);
  }
}

export function dismissAllNotifications(ids: string[]): void {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const now = Date.now();
    ids.forEach(id => {
      parsed[id] = now;
    });
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error("Failed to dismiss notifications", e);
  }
}

export function isNotificationDismissed(id: string): boolean {
  return getDismissedNotifications().has(id);
}

export function dismissSingleNotification(id: string): void {
  dismissNotification(id);
}
