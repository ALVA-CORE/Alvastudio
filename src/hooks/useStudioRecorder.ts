import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderPhase =
  | "idle"
  | "recording"
  | "paused"
  | "recorded"
  | "playing";

/**
 * What to record in, best first.
 *
 * `new MediaRecorder(stream)` with no type gives whatever the browser prefers,
 * which is webm/Opus on Chrome and **mp4/AAC on iOS Safari**. We were then
 * labelling every blob `audio/webm` regardless, so on an iPhone the file was
 * mp4 wearing a webm label: Safari refused to play it back, and the upload
 * told the API the wrong format. Asking for a type we can name, and keeping
 * whatever the recorder actually gave us, fixes both.
 */
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported?.(type));
}

/** `audio/webm;codecs=opus` → `webm`. The API reads the extension. */
function extensionFor(mimeType: string): string {
  const base = mimeType.split(";")[0];
  if (base === "audio/mpeg") return "mp3";
  return base.split("/")[1] ?? "webm";
}

export function useStudioRecorder() {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasBlob, setHasBlob] = useState(false);
  /* Mirrored into state as well as the ref because the voice beam is a
   * consumer: a ref alone never re-renders, so the glow would never pick the
   * stream up. The ref stays for the cleanup paths, which run outside render. */
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  /** What the recorder actually produced. Drives playback and the upload. */
  const mimeTypeRef = useRef<string>("audio/webm");
  /** The mic the browser actually opened, for `device_mic` on the upload. */
  const deviceMicRef = useRef<string>("");
  /** Wall-clock length of the take, for the recording's `duration_seconds`. */
  /**
   * When the current run began, or null while paused.
   *
   * Null rather than 0: a falsy check reads a genuine `Date.now()` of 0 as
   * "paused", which is only reachable in a test but was wrong there, and a
   * sentinel that means two things is wrong wherever it is reached.
   */
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);
  /**
   * Seconds banked before the current run.
   *
   * Pausing cannot be measured by `Date.now() - startedAt`: a take paused for
   * two minutes would report two minutes of audio it does not contain, and
   * the API would be told a length the file disagrees with. Each run is
   * added up as it ends, and `startedAt` restarts on resume.
   */
  const elapsedRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /**
   * The element currently playing a take back, mirrored into state.
   *
   * The waveform draws from it, and a ref alone never re-renders, so the
   * strip would stay flat through the whole playback.
   */
  const [playbackElement, setPlaybackElement] = useState<HTMLAudioElement | null>(
    null
  );

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
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
      setStream(stream);

      /* Read while the track is live: the label is cleared when it stops, and
       * it is empty before permission is granted. Blank on a browser that
       * withholds it, which the upload then simply omits. */
      deviceMicRef.current = stream.getAudioTracks()[0]?.label ?? "";

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      elapsedRef.current = 0;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        /* The recorder's own type, not an assumption. `recorder.mimeType` is
         * what it actually produced, which on Safari is not what we asked
         * for. */
        const type = recorder.mimeType || mimeType || "audio/webm";
        mimeTypeRef.current = type;
        blobRef.current = new Blob(chunksRef.current, { type });
        /* `startedAt` is null while paused, so a take stopped from a pause
           counts only what was banked. */
        durationRef.current =
          elapsedRef.current +
          (startedAtRef.current === null
            ? 0
            : (Date.now() - startedAtRef.current) / 1000);
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

  /**
   * Holds the take without ending it.
   *
   * `MediaRecorder.pause` keeps the chunks already gathered and stops adding
   * to them, so resuming continues the same file rather than starting a
   * second one. The mic track stays open on purpose: stopping it would drop
   * the permission and the device label, and reopening mid-take can land on
   * a different input.
   */
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    if (startedAtRef.current !== null) {
      elapsedRef.current += (Date.now() - startedAtRef.current) / 1000;
    }
    startedAtRef.current = null;
    setPhase("paused");
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    recorder.resume();
    startedAtRef.current = Date.now();
    setPhase("recording");
  }, []);

  const playRecording = useCallback(async () => {
    if (!blobRef.current) return;

    setError(null);

    /* Resume where it stopped rather than starting the take again. Playback
       can be paused now, and a pause that silently rewinds is a pause nobody
       would use twice. */
    const current = audioRef.current;
    if (current && current.paused && current.currentTime > 0 && !current.ended) {
      try {
        await current.play();
        setPhase("playing");
        return;
      } catch {
        /* Falls through and plays it from the top. */
      }
    }

    if (current) current.pause();

    const url = URL.createObjectURL(blobRef.current);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPhase("recorded");
      setPlaybackElement(null);
      URL.revokeObjectURL(url);
    };

    try {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
      await audio.play();
      setPlaybackElement(audio);
      setPhase("playing");
    } catch {
      setError("Could not play back this recording.");
      setPhase("recorded");
      setPlaybackElement(null);
      URL.revokeObjectURL(url);
    }
  }, []);

  /** Holds playback where it is. `playRecording` picks it up from there. */
  const pausePlayback = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPhase("recorded");
  }, []);

  const discardRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    /* A discard while paused leaves a live recorder behind otherwise, which
       keeps the mic indicator on and quietly refuses the next start. */
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    blobRef.current = null;
    durationRef.current = 0;
    elapsedRef.current = 0;
    startedAtRef.current = null;
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
    /**
     * The live capture, while one is open — null otherwise.
     *
     * Exposed so the voice beam can analyse the same stream that is being
     * recorded. Opening a second one through the library's own `useMicrophone`
     * would mean two `getUserMedia` grants, two live tracks and two recording
     * indicators, with the glow reacting to a different capture than the take.
     */
    stream,
    /** The element playing a take back, for the waveform. Null when silent. */
    playbackElement,
    /** The recorded audio, for upload. Null until a take is finished. */
    getBlob: () => blobRef.current,
    /** Filename with the real extension, so the API sees the real format. */
    getFilename: () => `recording.${extensionFor(mimeTypeRef.current)}`,
    /** Seconds of wall-clock recording, measured rather than decoded. */
    getDuration: () => durationRef.current,
    /**
     * The microphone the take was recorded on, as the browser named it.
     *
     * Empty where the browser withholds the label, which is every browser
     * before permission is granted and some after. The upload leaves
     * `device_mic` off rather than sending a guess.
     */
    getDeviceMic: () => deviceMicRef.current,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    playRecording,
    pausePlayback,
    discardRecording,
  };
}
