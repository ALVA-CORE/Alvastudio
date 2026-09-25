import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderPhase = "idle" | "recording" | "recorded" | "playing";

export function useStudioRecorder() {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasBlob, setHasBlob] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  /** Wall-clock length of the take, for the recording's `duration_seconds`. */
  const startedAtRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        durationRef.current = (Date.now() - startedAtRef.current) / 1000;
        setHasBlob(Boolean(blobRef.current.size));
        cleanupStream();
        setPhase("recorded");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch {
      setError("Microphone access is required to record.");
      setPhase("idle");
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const playRecording = useCallback(async () => {
    if (!blobRef.current) return;

    setError(null);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = URL.createObjectURL(blobRef.current);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPhase("recorded");
      URL.revokeObjectURL(url);
    };

    try {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
      await audio.play();
      setPhase("playing");
    } catch {
      setError("Could not play back this recording.");
      setPhase("recorded");
      URL.revokeObjectURL(url);
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    blobRef.current = null;
    durationRef.current = 0;
    chunksRef.current = [];
    setHasBlob(false);
    cleanupStream();
    setPhase("idle");
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (audioRef.current) audioRef.current.pause();
      void audioContextRef.current?.close();
    };
  }, [cleanupStream]);

  return {
    phase,
    error,
    hasBlob,
    /** The recorded audio, for upload. Null until a take is finished. */
    getBlob: () => blobRef.current,
    /** Seconds of wall-clock recording, measured rather than decoded. */
    getDuration: () => durationRef.current,
    startRecording,
    stopRecording,
    playRecording,
    discardRecording,
  };
}
