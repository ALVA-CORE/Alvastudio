import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate } from "react-router-dom";
import Diskette from "@solar-icons/react/devices/Diskette";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Stop from "@solar-icons/react/video/Stop";
import Play from "@solar-icons/react/video/Play";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import { useApiResource } from "@/hooks/useApiResource";
import { listPrompts, listStimuli } from "@/lib/api/catalog";
import {
  recordingQuota,
  NARRATION_MAX_SECONDS,
  type ApiRecordingQuota,
} from "@/lib/api/recordings";
import { submitPromptRead, submitStimulus } from "@/lib/api/recordings";
import { ApiError } from "@/lib/api/client";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";
import { alvaToast } from "@/lib/alva-toast";
import { ContributorDesktopGate } from "@/components/layout/ContributorDesktopGate";
import { StudioModeDropdown, type StudioMode } from "@/components/contributors/studio/StudioModeDropdown";
import { StudioProgress } from "@/components/contributors/studio/StudioProgress";
import { StudioPromptStack } from "@/components/contributors/studio/StudioPromptStack";
import { StudioSiriControl } from "@/components/contributors/studio/StudioSiriControl";
import { StudioTakeActions } from "@/components/contributors/studio/StudioTakeActions";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { StudioPromptStackSkeleton } from "@/components/contributors/studio/StudioPromptStackSkeleton";
import { StudioVoiceBeam } from "@/components/contributors/studio/StudioVoiceBeam";

/**
 * When uploads reopen, in the contributor's own time.
 *
 * `available_again_at` is a WAT instant, so a plain local time is right: the
 * limit resets at midnight in Nigeria and everybody using this is there.
 */
function reopensAt(at: string | null | undefined) {
  if (!at) return "";
  const when = new Date(at);
  return `, back at ${when.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/**
 * Why they cannot record, in the words of the task they are on.
 *
 * Two allowances since 29 Oct, counted in different units: sentences for
 * Prompt Reader, speaking minutes for narration. One shared "upload limit
 * reached" would be wrong about at least one of them, and the whole point
 * is that the other task is still open.
 */
function quotaMessage(quota: ApiRecordingQuota | null, mode: StudioMode) {
  if (mode === "stimuli") {
    return `Today's 15 minutes of narration are used${reopensAt(quota?.narration?.resets_at)}`;
  }
  return `Today's sentences are read${reopensAt(
    quota?.prompt_read?.resets_at ?? quota?.available_again_at
  )}`;
}

const MODE_LABEL: Record<Exclude<StudioMode, "focus">, string> = {
  prompt: "Prompt reader",
  stimuli: "Stimuli",
};

export default function ContributorStudioPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);
  const [mode, setMode] = useState<Exclude<StudioMode, "focus">>("prompt");

  const [isSaving, setSaving] = useState(false);

  /**
   * The prompts handed to this contributor, paged locally.
   *
   * This used to read the whole bank on the reasoning that a prompt is not
   * consumed by being read. **That stopped being true on 29 Oct**: each
   * prompt now has two places, is reserved for whoever holds it for 24
   * hours, and a third contributor trying to read it is refused.
   *
   * `GET /prompts` answers a contributor with their own held prompts now,
   * so the same call returns the right set without a change here — it tops
   * itself up to twenty, and never more than they can still read today.
   * An empty bank means every prompt has its two readers, or they have read
   * today's allowance.
   *
   * Stimuli are not capped and still page the whole list.
   */
  const fetchBank = useCallback(
    () =>
      mode === "stimuli"
        ? listStimuli({ is_active: true, limit: 200 })
        : listPrompts({ is_active: true, limit: 200 }),
    [mode]
  );

  const {
    data: bank,
    isLoading: loadingCard,
    error: cardError,
  } = useApiResource(fetchBank, [mode]);

  /* Checked before anybody speaks. A refusal at upload would throw away a
   * take somebody has just recorded, which is the one failure worth a round
   * trip to avoid. */
  const { data: quota, reload: reloadQuota } = useApiResource(recordingQuota, []);
  /**
   * Each task closes on its own.
   *
   * Reading one `remaining` for both would shut the studio because
   * somebody had used their sentences, while a quarter of an hour of
   * narration sat open.
   */
  const outOfQuota =
    quota != null &&
    (mode === "stimuli"
      ? (quota.narration?.remaining_seconds ?? 0) <= 0
      : (quota.prompt_read?.remaining ?? quota.remaining) <= 0);

  /**
   * How long this take may run, in recorded seconds.
   *
   * The smaller of the API's per-take cap and what is left of today, because
   * a take over either is refused rather than truncated and the recording is
   * lost. Null for prompt reading, which is counted in sentences and has no
   * length limit.
   *
   * `NARRATION_MAX_SECONDS` covers the moment before the quota call answers:
   * the alternative is letting somebody talk for two minutes into a 422.
   */
  const takeLimit =
    mode !== "stimuli"
      ? null
      : Math.max(
          1,
          Math.min(
            quota?.narration?.max_recording_seconds ?? NARRATION_MAX_SECONDS,
            quota?.narration?.remaining_seconds ?? NARRATION_MAX_SECONDS
          )
        );

  const recorder = useStudioRecorder({ maxSeconds: takeLimit });

  /* The recorder ends a narration take by itself at the limit. Said once,
     when it happens, because otherwise the take simply stops and looks like
     a fault. */
  useEffect(() => {
    if (!recorder.autoStopped) return;
    alvaToast.show(
      takeLimit && takeLimit < (quota?.narration?.max_recording_seconds ?? 120)
        ? "That is all of today's narration time. The take was saved."
        : "A narration take can be 2 minutes. The take was saved."
    );
  }, [recorder.autoStopped, takeLimit, quota]);

  /* A take in progress, or one recorded and not yet saved. Moving card
   * discards the recording, so the stack is locked until they finish, retake
   * or save: losing audio somebody just spoke to a stray arrow press is the
   * one mistake this page can make that cannot be undone. */
  const recordingInProgress = recorder.phase !== "idle";


  const items = (bank ?? []).map((entry) => ({ id: entry.id, prompt: entry.text }));
  const total = items.length;

  /* Which card is on top. Paging is local now, so swiping does not refetch. */
  /**
   * `index` counts moves, not position: it grows without bound as somebody
   * swipes, and wraps only where it is read.
   *
   * It used to wrap in one of the two places that read it, so the card was
   * right and the counter said "13/12" on a bank of twelve. Wrapped once,
   * here, and everything downstream takes the wrapped value.
   */
  const [index, setIndex] = useState(0);
  const position = total > 0 ? ((index % total) + total) % total : 0;
  const card = total > 0 ? items[position] : null;

  /* A fresh bank, or a switch between prompts and stimuli, starts at the top
   * rather than wherever the previous one had been left. */
  useEffect(() => setIndex(0), [mode, total]);

  useEffect(() => {
    if (recorder.error) {
      alvaToast.error(recorder.error);
    }
  }, [recorder.error]);

  if (isStaff) {
    return <Navigate to="/intern/record" replace />;
  }

  if (!isMobile) {
    return <ContributorDesktopGate />;
  }

  const handleModeChange = (nextMode: StudioMode) => {
    if (nextMode === "focus") return;
    setMode(nextMode);
    recorder.discardRecording();
    alvaToast.show(`Switched to ${MODE_LABEL[nextMode]}`, { variant: "default" });
  };


  const handleHold = () => {
    recorder.pauseRecording();
    alvaToast.show("Take paused, press play to carry on");
  };

  const handleStop = () => {
    recorder.stopRecording();
    alvaToast.success("Take saved, tap play to review", <Stop size={14} weight="Bold" />);
  };


  const handlePrimary = async () => {
    /* No card means no `prompt_id` to submit against, so a take recorded here
       could never be uploaded — it used to be allowed, then failed at Save
       with "Record a take first", which blamed the wrong thing. */
    if (!card && recorder.phase === "idle") {
      alvaToast.show("Nothing to record right now", { variant: "default" });
      return;
    }

    if (outOfQuota && recorder.phase === "idle") {
      alvaToast.show(quotaMessage(quota, mode), { variant: "default" });
      return;
    }

    if (recorder.phase === "idle") {
      await recorder.startRecording();
      alvaToast.accent("Recording started", <Microphone3 size={14} weight="Bold" />);
      return;
    }
    /* A tap ends the take. Holding pauses it, which the control handles
       itself and routes to `handleHold`. */
    if (recorder.phase === "recording") {
      handleStop();
      return;
    }
    if (recorder.phase === "paused") {
      recorder.resumeRecording();
      return;
    }
    /* Playing: the glyph is a pause, so the press holds it where it is. */
    if (recorder.phase === "playing") {
      recorder.pausePlayback();
      return;
    }
    if (recorder.phase === "recorded") {
      await recorder.playRecording();
      alvaToast.show("Playing your take", {
        variant: "default",
        icon: <Play size={14} weight="Bold" />,
      });
    }
  };

  const handleRetake = () => {
    recorder.discardRecording();
    alvaToast.show("Take cleared, ready to record again");
  };

  const handleSave = async () => {
    const blob = recorder.getBlob();
    if (!blob) {
      alvaToast.error("Record a take first");
      return;
    }
    if (!card) {
      alvaToast.error("This take has no prompt to attach to");
      return;
    }

    setSaving(true);
    try {
      const meta = {
        durationSeconds: recorder.getDuration(),
        /* The real extension, from what the recorder produced. An mp4
         * sent as .webm is a 415 or a mis-decode at the other end. */
        filename: recorder.getFilename(),
        /* What the clip was actually recorded on. The profile holds a device
         * the contributor typed once; this is the mic in front of them for
         * this take, which is what a reviewer judging audio quality needs. */
        deviceMic: recorder.getDeviceMic() || undefined,
      };

      if (mode === "stimuli") {
        await submitStimulus(card.id, blob, meta);
      } else {
        await submitPromptRead(card.id, blob, meta);
      }

      alvaToast.success("Clip sent for review", <Diskette size={14} weight="Bold" />);
      reloadQuota();
      recorder.discardRecording();
      setIndex((value) => value + 1);
    } catch (cause) {
      /**
       * A prompt with both its places taken.
       *
       * Since 29 Oct each prompt has two readers and no more. The take is
       * already recorded when this lands, so moving to the next card and
       * keeping the audio would be wrong in the other direction — the clip
       * cannot be attached to anything. Dropping it and moving on is the
       * honest outcome, said plainly, rather than leaving somebody pressing
       * Save on a prompt that will never accept it.
       */
      if (cause instanceof ApiError && cause.status === 409) {
        alvaToast.show(cause.message, { variant: "default" });
        recorder.discardRecording();
        setIndex((value) => value + 1);
        return;
      }

      alvaToast.error(
        cause instanceof ApiError ? cause.message : "Could not upload the clip."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 py-6">
        <div className="flex items-start gap-2">
          <StudioModeDropdown
            value={mode}
            onChange={handleModeChange}
            allowFocusGroup={false}
            focusGroupOnly={false}
          />
          <StudioProgress
            className="min-w-0 flex-1"
            current={total ? position + 1 : 0}
            total={total}
            label={loadingCard ? "Loading…" : total ? "Next up" : "Queue empty"}
          />
        </div>

        {loadingCard ? (
          <StudioPromptStackSkeleton className="mt-8" />
        ) : cardError ? (
          <p role="alert" className="mt-8 text-center text-sm text-destructive">
            {cardError}
          </p>
        ) : total === 0 ? (
          /* 404 from /next means the bank is exhausted for this contributor —
             an end state, not a failure. */
          <AlvaEmptyState
            className="mt-6"
            icon={<ClipboardCheck size={20} weight="Outline" />}
            title="Nothing left to record"
            description="You have worked through every prompt in the bank. Check back later for more."
          />
        ) : (
          <StudioPromptStack
            className="mt-8"
            items={items}
            current={position}
            /* A stimulus is a scene to talk about, not a sentence to read.
               Telling somebody to read one is telling them to do the wrong
               thing, and it is the instruction they follow. */
            hint={
              mode === "stimuli"
                ? "and talk about it in your own words"
                : "and read the sentence aloud"
            }
            locked={recordingInProgress}
            /* Guarded as well as disabled: the top card can be dragged, and
               a swipe does not go through the arrow buttons. */
            onNext={() => !recordingInProgress && setIndex((value) => value + 1)}
            onPrevious={() => !recordingInProgress && setIndex((value) => value - 1)}
          />
        )}

        {!loadingCard && (
        <StudioSiriControl
          className="mt-10 h-20"
          phase={recorder.phase}
          onPrimary={handlePrimary}
          onHold={handleHold}
          stream={recorder.stream}
          playbackElement={recorder.playbackElement}
          disabled={(!card || outOfQuota) && recorder.phase === "idle"}
          disabledLabel={
            outOfQuota ? quotaMessage(quota, mode) : "Nothing to record right now"
          }
        />
        )}

        {recorder.error && (
          <p className="mt-3 text-center text-xs text-destructive">{recorder.error}</p>
        )}

        {/* Present so the row can leave as well as arrive: without it the
            actions vanish the instant a retake starts. */}
        <AnimatePresence initial={false}>
          {recorder.hasBlob && recorder.phase !== "idle" ? (
            <StudioTakeActions
            className="mt-8"
              onRetake={handleRetake}
              onSave={handleSave}
              isSaving={isSaving}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <StudioVoiceBeam
        stream={recorder.stream}
        phase={recorder.phase}
        processing={isSaving}
      />
    </>
  );
}
