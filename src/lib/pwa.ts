import { useSyncExternalStore } from "react";

/**
 * The contributor app, installed to a home screen.
 *
 * Chrome, Edge and Android hand over an install prompt once (the
 * `beforeinstallprompt` event), usually before the profile page that offers
 * it has mounted, so it is caught here at start-up and held. iOS has no
 * prompt: installing there is Share, then Add to Home Screen, by hand.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** `installed`: running as the app. `prompt`: we can ask. `ios`: steps by hand. */
export type InstallMode = "installed" | "prompt" | "ios" | "unavailable";

let deferred: InstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/* iPadOS reports itself as a Mac; the touch points give it away. */
const ios = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function mode(): InstallMode {
  if (installedNow || standalone()) return "installed";
  if (deferred) return "prompt";
  if (ios()) return "ios";
  return "unavailable";
}

/** Called once, before the app renders. */
export function startPwa() {
  window.addEventListener("beforeinstallprompt", (event) => {
    /* Ours to offer from the profile, not the browser's own bar. */
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installedNow = true;
    deferred = null;
    emit();
  });

  /* Production only: a worker in development serves yesterday's bundle. */
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

/** Shows the browser's install prompt. The prompt can be used once. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return "dismissed" as const;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null;
  emit();
  return outcome;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, mode, () => "unavailable");
}
