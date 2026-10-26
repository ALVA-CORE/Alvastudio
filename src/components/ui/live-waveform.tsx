import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { bandAt } from "@/components/ui/live-waveform-band";
import { cn } from "@/lib/utils";

/**
 * Real-time audio waveform, drawn on a canvas.
 *
 * From the ElevenLabs UI component set, with one change that matters here:
 * **it will use a `MediaStream` you already hold** rather than always opening
 * its own. The studio recorder opens the mic once and records from it, and a
 * second `getUserMedia` would mean two live tracks, two recording indicators
 * in the browser chrome, and a visualiser reacting to a different capture
 * than the take being saved. Pass `stream` and it analyses that; pass
 * `active` with no stream and it opens one itself, as the original does.
 *
 * Canvas rather than forty animated DOM nodes: this repaints every 30ms, and
 * at that rate a React tree of bars spends more time in reconciliation than
 * in drawing.
 */

export type LiveWaveformMode = "scrolling" | "static";


export type LiveWaveformProps = Omit<ComponentProps<"div">, "children"> & {
  /** Listen to the microphone. Ignored for permissions when `stream` is set. */
  active?: boolean;
  /** An already-open capture to analyse. Nothing is requested when given. */
  stream?: MediaStream | null;
  /**
   * A playing `<audio>` to analyse instead of a microphone.
   *
   * Routed through the same analyser and then on to the speakers, so the
   * strip moves with the take being played back rather than sitting flat.
   */
  element?: HTMLMediaElement | null;
  /** Animate a waiting pattern while there is nothing to listen to. */
  processing?: boolean;
  barWidth?: number;
  barHeight?: number;
  barGap?: number;
  barRadius?: number;
  /** Defaults to the element's own text colour. */
  barColor?: string;
  fadeEdges?: boolean;
  fadeWidth?: number;
  height?: string | number;
  sensitivity?: number;
  smoothingTimeConstant?: number;
  fftSize?: number;
  /** Bars kept in history, in scrolling mode. */
  historySize?: number;
  /** Milliseconds between repaints. */
  updateRate?: number;
  mode?: LiveWaveformMode;
  onError?: (error: Error) => void;
  onStreamReady?: (stream: MediaStream) => void;
  onStreamEnd?: () => void;
};

export function LiveWaveform({
  active = false,
  stream: externalStream = null,
  element = null,
  processing = false,
  barWidth = 3,
  barHeight = 4,
  barGap = 1,
  barRadius = 1.5,
  barColor,
  fadeEdges = true,
  fadeWidth = 24,
  height = 64,
  sensitivity = 1,
  smoothingTimeConstant = 0.8,
  fftSize = 256,
  historySize = 60,
  updateRate = 30,
  mode = "static",
  onError,
  onStreamReady,
  onStreamEnd,
  className,
  style,
  ...props
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  /* Only set when this component opened it, so cleanup never stops a track
     somebody else is still recording from. */
  const ownedStreamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const lastDrawRef = useRef(0);
  const historyRef = useRef<number[]>([]);
  const phaseRef = useRef(0);

  const listening = active || Boolean(externalStream) || Boolean(element);

  /* Read in the draw loop, which is not a React render, so they live in refs
     rather than closing over a stale props object. */
  const paint = useRef({
    barWidth,
    barHeight,
    barGap,
    barRadius,
    barColor,
    sensitivity,
    historySize,
    mode,
    processing,
    listening,
  });
  paint.current = {
    barWidth,
    barHeight,
    barGap,
    barRadius,
    barColor,
    sensitivity,
    historySize,
    mode,
    processing,
    listening,
  };

  const draw = useCallback(() => {
    frameRef.current = requestAnimationFrame(draw);

    const now = performance.now();
    if (now - lastDrawRef.current < updateRate) return;
    lastDrawRef.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const tall = canvas.clientHeight;
    if (width === 0 || tall === 0) return;

    if (canvas.width !== width * dpr || canvas.height !== tall * dpr) {
      canvas.width = width * dpr;
      canvas.height = tall * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, tall);

    const p = paint.current;
    ctx.fillStyle = p.barColor ?? getComputedStyle(canvas).color;

    const slot = p.barWidth + p.barGap;
    const count = Math.max(1, Math.floor(width / slot));
    const middle = tall / 2;
    const ceiling = tall / 2 - 1;

    const analyser = analyserRef.current;
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    if (analyser && bins) analyser.getByteFrequencyData(bins);

    /** 0 to 1, for the bar at `index` of `count`. */
    const levelAt = (index: number) => {
      if (!p.listening || !bins) {
        if (!p.processing) return 0;
        /* A travelling wave, so "waiting" does not look like "dead". */
        const t = phaseRef.current;
        /* Symmetric too, so the resting pattern and the live one are the
           same shape. */
        const d = Math.abs(index - (count - 1) / 2);
        return 0.18 + 0.16 * Math.sin(d * 0.35 - t) + 0.08 * Math.sin(d * 0.11 - t * 1.7);
      }

      /* Only the lower part of the spectrum is used: the top of an FFT of
         speech is close to flat and would draw a flat row. */
      const half = Math.max(1, Math.ceil(count / 2));
      const fromCentre = bandAt(index, count);

      const usable = Math.floor(bins.length * 0.6);
      const from = Math.floor(fromCentre * usable);
      const to = Math.max(from + 1, Math.floor((fromCentre + 1 / half) * usable));

      let sum = 0;
      for (let i = from; i < Math.min(to, bins.length); i += 1) sum += bins[i];
      const level = sum / Math.max(1, Math.min(to, bins.length) - from) / 255;

      /* The outer bars carry the quiet end of the spectrum, so without this
         the strip tapers to nothing and reads as a narrower control than it
         is. */
      const lift = 1 - fromCentre * 0.35;
      return Math.min(1, level * p.sensitivity * lift);
    };

    phaseRef.current += 0.08;

    if (p.mode === "scrolling") {
      let level = 0;
      if (p.listening && bins) {
        let sum = 0;
        for (let i = 0; i < bins.length; i += 1) sum += bins[i];
        level = Math.min(1, (sum / bins.length / 255) * p.sensitivity);
      } else if (p.processing) {
        level = 0.18 + 0.14 * Math.sin(phaseRef.current);
      }

      historyRef.current.push(level);
      /* Only as much history as there is room to draw, so a narrow canvas
         does not hold a minute of audio nobody can see. */
      const keep = Math.min(p.historySize, count);
      if (historyRef.current.length > keep) {
        historyRef.current.splice(0, historyRef.current.length - keep);
      }

      const history = historyRef.current;
      /* Drawn from the right, so new bars arrive at the leading edge and the
         canvas fills up over time instead of starting full of zeroes. */
      for (let i = 0; i < history.length; i += 1) {
        const h = Math.max(p.barHeight, history[history.length - 1 - i] * ceiling * 2);
        const x = width - (i + 1) * slot;
        if (x + p.barWidth < 0) break;
        roundedBar(ctx, x, middle - h / 2, p.barWidth, h, p.barRadius);
      }
      return;
    }

    for (let i = 0; i < count; i += 1) {
      const h = Math.max(p.barHeight, levelAt(i) * ceiling * 2);
      roundedBar(ctx, i * slot, middle - h / 2, p.barWidth, h, p.barRadius);
    }
  }, [updateRate]);

  /* The canvas repaints on its own clock whether or not anything is coming
     in: idle draws the resting bar row, which is the shape the live one
     grows out of. */
  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  useEffect(() => {
    if (!listening) {
      historyRef.current = [];
      return;
    }

    let cancelled = false;

    /**
     * An audio element, analysed on its way to the speakers.
     *
     * `createMediaElementSource` takes the element's output away from the
     * default route, so the analyser has to be connected on to `destination`
     * or the take plays silently. It can also only be called once per
     * element, which is why a failure here falls back to leaving the element
     * alone rather than retrying: a silent playback is worse than a flat
     * waveform.
     */
    const attachElement = (media: HTMLMediaElement) => {
      if (cancelled) return;

      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

        const context = new AudioCtx();
        const analyser = context.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;

        const source = context.createMediaElementSource(media);
        source.connect(analyser);
        analyser.connect(context.destination);

        contextRef.current = context;
        analyserRef.current = analyser;
      } catch {
        /* Already wired to another context, or blocked. The strip draws its
           resting row and the audio still plays. */
      }
    };

    const attach = (source: MediaStream) => {
      if (cancelled) {
        if (ownedStreamRef.current === source) {
          source.getTracks().forEach((track) => track.stop());
          ownedStreamRef.current = null;
        }
        return;
      }

      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      const context = new AudioCtx();
      const analyser = context.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      context.createMediaStreamSource(source).connect(analyser);

      contextRef.current = context;
      analyserRef.current = analyser;
      onStreamReady?.(source);
    };

    if (element) {
      attachElement(element);
    } else if (externalStream) {
      attach(externalStream);
    } else {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((opened) => {
          ownedStreamRef.current = opened;
          attach(opened);
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            onError?.(cause instanceof Error ? cause : new Error("Microphone unavailable"));
          }
        });
    }

    return () => {
      cancelled = true;
      analyserRef.current = null;
      void contextRef.current?.close();
      contextRef.current = null;

      /* Only ours. A stream handed in belongs to whoever opened it, and
         stopping it here would end somebody else's recording. */
      if (ownedStreamRef.current) {
        ownedStreamRef.current.getTracks().forEach((track) => track.stop());
        ownedStreamRef.current = null;
        onStreamEnd?.();
      }
    };
    /* `onError` and friends are left out deliberately: an inline callback
       would tear the audio graph down and rebuild it on every render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, externalStream, fftSize, smoothingTimeConstant]);

  const mask = fadeEdges
    ? `linear-gradient(to right, transparent, black ${fadeWidth}px, black calc(100% - ${fadeWidth}px), transparent)`
    : undefined;

  return (
    <div
      className={cn("w-full", className)}
      style={{ height, ...style } as CSSProperties}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      />
    </div>
  );
}

function roundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export default LiveWaveform;
