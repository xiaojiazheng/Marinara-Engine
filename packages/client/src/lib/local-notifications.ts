export type LocalNotificationPermission = NotificationPermission | "insecure" | "unsupported";

export type LocalMessageNotificationOptions = {
  enabled: boolean;
  characterName?: string | null;
  title?: string;
  tag?: string;
};

function getBrowserNotificationPermission(): LocalNotificationPermission {
  if (typeof window === "undefined") return "unsupported";
  if (window.isSecureContext === false) return "insecure";
  if (!("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

async function requestBrowserNotificationPermission(): Promise<LocalNotificationPermission> {
  const current = getBrowserNotificationPermission();
  if (current === "insecure" || current === "unsupported") return current;
  if (window.Notification.permission !== "default") return window.Notification.permission;
  return window.Notification.requestPermission();
}

export async function getLocalNotificationPermission(): Promise<LocalNotificationPermission> {
  return getBrowserNotificationPermission();
}

export async function requestLocalNotificationPermission(): Promise<LocalNotificationPermission> {
  return requestBrowserNotificationPermission();
}

function isAppFocusedForNotifications(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && document.hasFocus();
}

function resolveMessageNotificationTitle(title?: string, characterName?: string | null): string {
  const explicitTitle = typeof title === "string" ? title.trim() : "";
  if (explicitTitle) return explicitTitle.slice(0, 100);
  const name = typeof characterName === "string" && characterName.trim() ? characterName.trim() : "Character";
  return `New message from ${name.slice(0, 80)}`;
}

export async function showLocalMessageNotification({
  enabled,
  characterName,
  title,
  tag,
}: LocalMessageNotificationOptions): Promise<boolean> {
  if (!enabled || isAppFocusedForNotifications()) return false;
  if (getBrowserNotificationPermission() !== "granted") return false;
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  const notificationTitle = resolveMessageNotificationTitle(title, characterName);
  const options = {
    body: "Open Marinara to read it.",
    icon: "/icon-192.png",
    tag,
    // Each completed reply should alert, even when replacing this chat's notification.
    renotify: Boolean(tag),
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (isAppFocusedForNotifications()) return false;
    if (registration?.active && typeof registration.showNotification === "function") {
      await registration.showNotification(notificationTitle, options);
      return true;
    }
  } catch (error) {
    console.warn("[Notifications] Service worker delivery failed:", error);
  }

  if (isAppFocusedForNotifications()) return false;
  try {
    // Development and browsers without an active worker can use desktop notifications.
    const notification = new window.Notification(notificationTitle, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.warn("[Notifications] Browser delivery failed:", error);
    return false;
  }
}
