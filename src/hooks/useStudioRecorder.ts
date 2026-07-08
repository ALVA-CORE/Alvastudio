import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderPhase = "idle" | "recording" | "recorded" | "playing";

const BAR_COUNT = 32;

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

  const stopTicker = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resetLevels = useCallback(() => {
    setLevels(Array(BAR_COUNT).fill(0));
  }, []);

  const tickLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buffer);

    const step = Math.floor(buffer.length / BAR_COUNT);
    const next = Array.from({ length: BAR_COUNT }, (_, i) => {
      const slice = buffer.slice(i * step, (i + 1) * step);
      const avg = slice.reduce((sum, v) => sum + v, 0) / Math.max(slice.length, 1);
      return Math.min(1, avg / 100);
    });

    setLevels(next);
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
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
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
        resetLevels();
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
      resetLevels();
      setPhase("recorded");
      disconnectSource();
      URL.revokeObjectURL(url);
    };

    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
      analyserRef.current = analyser;

      await audio.play();
      setPhase("playing");
      rafRef.current = requestAnimationFrame(tickLevels);
    } catch {
      setError("Could not play back this recording.");
      resetLevels();
      setPhase("recorded");
      URL.revokeObjectURL(url);
    }
  }, [
    disconnectSource,
    getAudioContext,
    resetLevels,
    stopTicker,
    tickLevels,
  ]);

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
