import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderPhase = "idle" | "recording" | "recorded" | "playing";

const BAR_COUNT = 40;

export function useStudioRecorder() {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [error, setError] = useState<string | null>(null);
  const [hasBlob, setHasBlob] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<
    MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null
  >(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const smoothLevelsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));

  const stopTicker = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resetLevels = useCallback(() => {
    smoothLevelsRef.current = Array(BAR_COUNT).fill(0);
    setLevels(Array(BAR_COUNT).fill(0));
  }, []);

  const tickLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buffer);

    const half = BAR_COUNT / 2;
    const usable = Math.min(buffer.length, 96);
    const next = Array(BAR_COUNT).fill(0);

    for (let i = 0; i < half; i++) {
      const start = Math.floor((i / half) * usable);
      const end = Math.floor(((i + 1) / half) * usable);
      const slice = buffer.slice(start, Math.max(start + 1, end));
      const avg =
        slice.reduce((sum, value) => sum + value, 0) / Math.max(slice.length, 1);
      const level = Math.min(1, avg / 90);

      next[half - 1 - i] = level;
      next[half + i] = level;
    }

    const smoothed = smoothLevelsRef.current.map(
      (prev, index) => prev * 0.72 + next[index] * 0.28
    );
    smoothLevelsRef.current = smoothed;
    setLevels(smoothed);
    rafRef.current = requestAnimationFrame(tickLevels);
  }, []);

  const disconnectSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* noop */
      }
      sourceRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const connectStreamAnalyser = useCallback(
    (stream: MediaStream) => {
      disconnectSource();
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.88;
      source.connect(analyser);
      sourceRef.current = source;
      analyserRef.current = analyser;
    },
    [disconnectSource, getAudioContext]
  );

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      connectStreamAnalyser(stream);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        setHasBlob(Boolean(blobRef.current.size));
        cleanupStream();
        disconnectSource();
        setPhase("recorded");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
      stopTicker();
      rafRef.current = requestAnimationFrame(tickLevels);
    } catch {
      setError("Microphone access is required to record.");
      setPhase("idle");
      resetLevels();
    }
  }, [
    cleanupStream,
    connectStreamAnalyser,
    disconnectSource,
    resetLevels,
    stopTicker,
    tickLevels,
  ]);

  const stopRecording = useCallback(() => {
    stopTicker();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, [stopTicker]);

  const playRecording = useCallback(async () => {
    if (!blobRef.current) return;

    setError(null);
    stopTicker();
    disconnectSource();

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = URL.createObjectURL(blobRef.current);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      stopTicker();
      setPhase("recorded");
      disconnectSource();
      URL.revokeObjectURL(url);
    };

    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.88;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
      analyserRef.current = analyser;

      await audio.play();
      setPhase("playing");
      rafRef.current = requestAnimationFrame(tickLevels);
    } catch {
      setError("Could not play back this recording.");
      setPhase("recorded");
      URL.revokeObjectURL(url);
    }
  }, [disconnectSource, getAudioContext, stopTicker, tickLevels]);

  const discardRecording = useCallback(() => {
    stopTicker();
    disconnectSource();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    blobRef.current = null;
    chunksRef.current = [];
    setHasBlob(false);
    cleanupStream();
    resetLevels();
    setPhase("idle");
  }, [cleanupStream, disconnectSource, resetLevels, stopTicker]);

  useEffect(() => {
    return () => {
      stopTicker();
      cleanupStream();
      disconnectSource();
      if (audioRef.current) audioRef.current.pause();
      void audioContextRef.current?.close();
    };
  }, [cleanupStream, disconnectSource, stopTicker]);

  return {
    phase,
    levels,
    error,
    hasBlob,
    startRecording,
    stopRecording,
    playRecording,
    discardRecording,
  };
}
