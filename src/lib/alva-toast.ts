import type { ReactNode } from "react";

export type AlvaToastVariant = "default" | "success" | "error" | "accent";

export type AlvaToastItem = {
  id: string;
  message: string;
  variant: AlvaToastVariant;
  icon?: ReactNode;
};

type Listener = (toasts: AlvaToastItem[]) => void;

const DISMISS_MS = 3600;
let idCounter = 0;
let toasts: AlvaToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener([...toasts]));
}

function remove(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  emit();
}

function push(item: Omit<AlvaToastItem, "id">) {
  const id = String(++idCounter);
  const next: AlvaToastItem = { ...item, id };
  toasts = [next, ...toasts].slice(0, 3);
  emit();

  timers.set(
    id,
    setTimeout(() => remove(id), DISMISS_MS)
  );

  return id;
}

export function subscribeToAlvaToasts(listener: Listener) {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

type AlvaToastOptions = {
  variant?: AlvaToastVariant;
  icon?: ReactNode;
};

export const alvaToast = {
  show(message: string, options: AlvaToastOptions = {}) {
    return push({
      message,
      variant: options.variant ?? "default",
      icon: options.icon,
    });
  },
  success(message: string, icon?: ReactNode) {
    return push({ message, variant: "success", icon });
  },
  error(message: string, icon?: ReactNode) {
    return push({ message, variant: "error", icon });
  },
  accent(message: string, icon?: ReactNode) {
    return push({ message, variant: "accent", icon });
  },
  dismiss(id: string) {
    remove(id);
  },
};
