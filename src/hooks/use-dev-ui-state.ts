import { useCallback, useEffect, useState } from "react";
import {
  cycleDevUiState,
  readDevUiState,
  writeDevUiState,
  type DevUiState,
} from "@/lib/dev-ui-state";

const DEV_UI_EVENT = "alva-dev-ui-state-change";

export function useDevUiState() {
  const [state, setState] = useState<DevUiState>(() => readDevUiState());

  useEffect(() => {
    const sync = () => setState(readDevUiState());
    window.addEventListener(DEV_UI_EVENT, sync);
    return () => window.removeEventListener(DEV_UI_EVENT, sync);
  }, []);

  const setDevUiState = useCallback((next: DevUiState) => {
    writeDevUiState(next);
    setState(next);
    window.dispatchEvent(new Event(DEV_UI_EVENT));
  }, []);

  const cycleDevUiStateMode = useCallback(() => {
    const next = cycleDevUiState(readDevUiState());
    setDevUiState(next);
  }, [setDevUiState]);

  return {
    devUiState: state,
    forceEmpty: state === "empty",
    forceLoading: state === "loading",
    setDevUiState,
    cycleDevUiStateMode,
  };
}

export function useDevRows<T>(rows: T[]) {
  const { forceEmpty } = useDevUiState();
  return forceEmpty ? [] : rows;
}

export function useSimulatedLoading(defaultMs = 500) {
  const { forceLoading, forceEmpty } = useDevUiState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (forceLoading) {
      setLoading(true);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), defaultMs);
    return () => window.clearTimeout(timer);
  }, [defaultMs, forceLoading, forceEmpty]);

  return forceLoading || loading;
}
