import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Renders something else when a subtree throws.
 *
 * `lazy()` throws at render when its chunk cannot be fetched — a dropped
 * connection mid-session, a stale hash after a deploy, a blocked CDN — and an
 * `onError` prop on the component inside cannot catch that, because the
 * component never got as far as mounting. Only a boundary can.
 *
 * This exists because a decorative WebGPU background took the whole
 * contributor dashboard down with it. Nothing optional should be able to do
 * that, so anything lazily loaded for looks gets wrapped.
 */
export class FallbackBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; label?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn(
        `[alva] ${this.props.label ?? "a lazy subtree"} failed and fell back:`,
        error,
        info.componentStack
      );
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
