import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * jsdom ships none of the layout, media or audio APIs this app touches, so the
 * gaps are filled once here rather than per-suite. Everything below is a
 * *shape* stub — enough for components to mount and for behaviour assertions to
 * be meaningful — not a simulation of the real API.
 */

afterEach(() => {
  cleanup();
});

/* ---------------------------------------------------------------- *
 * Layout observers — Radix primitives and visx's ParentSize both
 * construct these on mount.
 * ---------------------------------------------------------------- */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

/* ---------------------------------------------------------------- *
 * matchMedia — the app reads `prefers-reduced-motion` and breakpoints.
 * Defaults to "does not match" so animations stay enabled in tests.
 * ---------------------------------------------------------------- */
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/* ---------------------------------------------------------------- *
 * Layout metrics.
 *
 * jsdom reports every element as 0×0. `@tanstack/react-virtual` divides the
 * scroller's height by the row estimate to decide what to render, so a
 * zero-height scroller renders ZERO rows and every assertion about list content
 * fails for a reason that has nothing to do with the component. Giving elements
 * a plausible box makes virtualised lists testable.
 * ---------------------------------------------------------------- */
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get() {
    return VIEWPORT_HEIGHT;
  },
});

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get() {
    return VIEWPORT_WIDTH;
  },
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return VIEWPORT_HEIGHT;
  },
});

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return VIEWPORT_WIDTH;
  },
});

Element.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: VIEWPORT_WIDTH,
    bottom: VIEWPORT_HEIGHT,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    toJSON: () => ({}),
  } as DOMRect;
};

/* ---------------------------------------------------------------- *
 * Pointer capture — jsdom implements none of it, and Radix's Select and
 * Slider both call these during normal interaction. Without them the
 * trigger throws before the listbox ever opens.
 * ---------------------------------------------------------------- */
Element.prototype.hasPointerCapture ??= function hasPointerCapture() {
  return false;
};
Element.prototype.setPointerCapture ??= function setPointerCapture() {};
Element.prototype.releasePointerCapture ??= function releasePointerCapture() {};

/* ---------------------------------------------------------------- *
 * Scrolling — the transcript follows playback via scrollTo/scrollIntoView.
 * ---------------------------------------------------------------- */
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.scrollTo ??= function scrollTo() {};

/* ---------------------------------------------------------------- *
 * Media + audio — wavesurfer constructs an AudioContext and calls
 * play()/pause() on a real <audio> element, neither of which jsdom
 * implements. `play()` must resolve, not throw, or effects that await
 * it will reject unhandled.
 * ---------------------------------------------------------------- */
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, "load", {
  writable: true,
  value: vi.fn(),
});

class AudioContextStub {
  readonly sampleRate = 44100;
  readonly currentTime = 0;
  readonly destination = {};
  state: AudioContextState = "running";

  createGain() {
    return {
      gain: { value: 1, setValueAtTime: () => {} },
      connect: () => {},
      disconnect: () => {},
    };
  }

  createMediaElementSource() {
    return { connect: () => {}, disconnect: () => {} };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  decodeAudioData() {
    return Promise.resolve({
      duration: 0,
      length: 0,
      numberOfChannels: 1,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(0),
    });
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }

  resume() {
    return Promise.resolve();
  }

  suspend() {
    return Promise.resolve();
  }
}

vi.stubGlobal("AudioContext", AudioContextStub);
vi.stubGlobal("webkitAudioContext", AudioContextStub);

/* jsdom has no fetch-to-ArrayBuffer path for local asset URLs. */
if (!window.fetch) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
    })
  );
}
