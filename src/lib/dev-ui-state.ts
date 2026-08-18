export type DevUiState = "normal" | "empty" | "loading";

const STORAGE_KEY = "alva-dev-ui-state";

export function readDevUiState(): DevUiState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "empty" || value === "loading") return value;
    return "normal";
  } catch {
    return "normal";
  }
}

export function writeDevUiState(state: DevUiState) {
  if (state === "normal") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, state);
}

export function cycleDevUiState(current: DevUiState): DevUiState {
  if (current === "normal") return "empty";
  if (current === "empty") return "loading";
  return "normal";
}

export const DEV_UI_STATE_LABELS: Record<DevUiState, string> = {
  normal: "Normal",
  empty: "Empty",
  loading: "Loading",
};
