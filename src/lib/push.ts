import { useEffect, useSyncExternalStore } from "react";
import {
  forgetPushSubscription,
  getPushPublicKey,
  savePushSubscription,
  type ApiPushSubscription,
} from "@/lib/api/push";

/**
 * Push notifications on this device (ask #19).
 *
 * On or off per browser, not per account: the subscription belongs to the
 * browser, and the server files it under whoever sent it last. So signing
 * out forgets it on both sides, or the next person on a shared phone would
 * keep getting the last one's pushes.
 *
 * Production only, like the service worker it needs (`startPwa`). An iPhone
 * has `PushManager` only in the installed app (iOS 16.4+), never in a Safari
 * tab, so there the row is simply not offered; the install row already is.
 */

export type PushStatus = "unsupported" | "off" | "on" | "blocked";

/** This browser's subscription endpoint, as last read. Null is off. */
let endpoint: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const pushSupported = () =>
  import.meta.env.PROD === true &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function status(): PushStatus {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return endpoint && Notification.permission === "granted" ? "on" : "off";
}

const subscription = () =>
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.pushManager.getSubscription() ?? null);

/** The VAPID key arrives base64url; `applicationServerKey` wants the bytes. */
function keyBytes(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Reads this browser's subscription. With `save`, sends it again too, which
 * the API allows on every start: it keeps the server's copy current, and on a
 * shared phone it moves the pushes to whoever is signed in now.
 */
export async function refreshPush(save = false) {
  if (!pushSupported()) return;
  try {
    const current = await subscription();
    endpoint = current?.endpoint ?? null;
    if (current && save && Notification.permission === "granted") {
      await savePushSubscription(current.toJSON() as ApiPushSubscription);
    }
  } catch {
    /* Quiet: nothing here was asked for. */
  }
  emit();
}

/**
 * Asks for permission (call it straight from a tap), subscribes and saves.
 * Resolves with the new status; a refusal resolves "blocked" or "off".
 * Throws the `ApiError` when the server says no (503: push is off there).
 */
export async function turnOnPush(): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    emit();
    return status();
  }

  const key = await getPushPublicKey();
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw new Error("No service worker yet");

  const created = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(key),
  });
  try {
    await savePushSubscription(created.toJSON() as ApiPushSubscription);
  } catch (cause) {
    /* Unsaved, the server never pushes to it; keep the two in step. */
    await created.unsubscribe().catch(() => {});
    throw cause;
  }

  endpoint = created.endpoint;
  emit();
  return status();
}

/**
 * Forgets the subscription on the server, then in the browser. The browser
 * side is what stops pushes for certain, so a failed DELETE is not an error.
 */
export async function turnOffPush() {
  const current = await subscription().catch(() => null);
  if (current) {
    await forgetPushSubscription(current.endpoint).catch(() => {});
    await current.unsubscribe().catch(() => {});
  }
  endpoint = null;
  emit();
}

/**
 * For sign-out, before the token is dropped. Synchronous on purpose: the
 * DELETE reads the token as it is built, which is now. Never throws, never
 * waits, so signing out cannot fail because of it.
 */
export function forgetPush() {
  if (!pushSupported()) return;
  if (endpoint) void forgetPushSubscription(endpoint).catch(() => {});
  endpoint = null;
  emit();
  void subscription()
    .then((current) => current?.unsubscribe())
    .catch(() => {});
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePushStatus(): PushStatus {
  useEffect(() => {
    void refreshPush();
  }, []);
  return useSyncExternalStore(subscribe, status, () => "unsupported");
}
