import { useEffect, useState } from "react";
import Refresh from "@solar-icons/react/arrows/Refresh";
import ClapperboardText from "@solar-icons/react/video/ClapperboardText";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { TextureButton } from "@/components/ui/texture-button";
import type { ApiDraftTranscript } from "@/lib/api/annotations";
import { alvaToast } from "@/lib/alva-toast";
import { cn } from "@/lib/utils";

type Participant = { id: string; label: string };

/** Seconds as "1m 48s", which is how long a voice spoke. */
function spoken(seconds: number) {
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  return mins > 0 ? `${mins}m ${whole % 60}s` : `${whole}s`;
}

/**
 * What the draft transcript is doing, and who its voices are.
 *
 * Four states, and they are not four shades of one thing:
 *
 * - **on its way** — Scribe is still running. Nothing is pushed to the
 *   browser, so there is a button rather than a spinner: the annotator
 *   decides when to look, and we make no background requests against a
 *   document they may be editing.
 * - **arrived too late** — a transcript exists but this draft was already
 *   started, so it was not applied. Worth saying, because otherwise they
 *   transcribe by hand next to a transcript nobody mentioned.
 * - **needs naming** — the draft was filled and its voices are unnamed.
 *   This is the common case and the only one with work in it.
 * - **failed** — Scribe gave up. An admin can queue it again.
 *
 * **Naming happens once per voice, not per row.** A voice is one speaker
 * across the whole session, so one pick renames every segment it covers.
 * The row dropdown does the same thing for a single correction afterwards.
 *
 * The suggestion is pre-selected and never applied on anybody's behalf. It
 * comes from the intern's live tagging, which is approximate — two voices
 * can suggest the same person, and nobody but the annotator has heard the
 * audio.
 */
export function TranscriptDraftBanner({
  transcript,
  participants,
  onReload,
  onLink,
  className,
}: {
  transcript: ApiDraftTranscript | null;
  participants: Participant[];
  onReload: () => void;
  onLink: (
    links: { speaker_label: string; participant_id: string | null }[]
  ) => Promise<string | null>;
  className?: string;
}) {
  const unnamed = (transcript?.speakers ?? []).filter(
    (speaker) => !speaker.participant_id
  );

  /* Seeded from the API's suggestion, then the annotator's to change. */
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPicks(
      Object.fromEntries(
        unnamed.map((speaker) => [
          speaker.speaker_label,
          speaker.suggested_participant_id ?? "",
        ])
      )
    );
    /* Keyed on the labels rather than the array, so re-rendering does not
       throw away a choice the annotator has just made. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unnamed.map((s) => s.speaker_label).join("|")]);

  if (!transcript) return null;

  const status = transcript.status;
  const waiting = status === "pending" || status === "processing";
  const notApplied = status === "done" && transcript.prefilled_at === null;

  if (waiting) {
    return (
      <Strip className={className} icon={<ClapperboardText size={16} weight="Outline" />}>
        <span className="flex-1">
          A draft transcript is being made for this session. It usually takes a
          few minutes.
        </span>
        <TextureButton
          variant="minimal"
          size="sm"
          className="w-auto shrink-0"
          onClick={onReload}
        >
          <Refresh size={14} weight="Outline" />
          Check again
        </TextureButton>
      </Strip>
    );
  }

  if (status === "failed") {
    return (
      <Strip
        className={className}
        tone="bad"
        icon={<DangerTriangle size={16} weight="Outline" />}
      >
        <span className="flex-1">
          A draft transcript could not be made for this session. Transcribe it
          as usual, or ask an admin to try again.
        </span>
      </Strip>
    );
  }

  if (notApplied) {
    return (
      <Strip className={className} icon={<ClapperboardText size={16} weight="Outline" />}>
        <span className="flex-1">
          A draft transcript arrived after you had started, so it was not
          applied. Your work is untouched.
        </span>
      </Strip>
    );
  }

  if (unnamed.length === 0 || dismissed) return null;

  const save = async () => {
    const links = unnamed
      .filter((speaker) => picks[speaker.speaker_label])
      .map((speaker) => ({
        speaker_label: speaker.speaker_label,
        participant_id: picks[speaker.speaker_label],
      }));

    if (links.length === 0) return;
    setSaving(true);

    const failure = await onLink(links);
    setSaving(false);

    if (failure) {
      alvaToast.error(failure);
      return;
    }
    alvaToast.success(
      links.length === 1 ? "Voice named" : `${links.length} voices named`
    );
  };

  const chosen = unnamed.filter((s) => picks[s.speaker_label]).length;

  return (
    <section
      className={cn("rounded-2xl bg-alva-surface px-3.5 py-3", className)}
      aria-label="Name the voices in this transcript"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {unnamed.length} {unnamed.length === 1 ? "voice needs" : "voices need"} naming
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Later
        </button>
      </div>

      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        Naming one here names it everywhere it speaks. You can change any row
        afterwards.
      </p>

      <ul className="mt-3 space-y-2">
        {unnamed.map((speaker, index) => (
          <li key={speaker.speaker_label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-xs text-foreground">
              Voice {index + 1}
              <span className="ml-1.5 text-muted-foreground">
                {spoken(speaker.seconds)}
              </span>
            </span>
            <AlvaSelect
              aria-label={`Who is voice ${index + 1}`}
              value={picks[speaker.speaker_label] ?? ""}
              onValueChange={(next) =>
                setPicks((current) => ({ ...current, [speaker.speaker_label]: next }))
              }
              placeholder="Choose"
              options={participants.map((person) => ({
                value: person.id,
                label: person.label,
              }))}
              className="flex-1"
            />
          </li>
        ))}
      </ul>

      <TextureButton
        variant="alva"
        size="sm"
        className="mt-3 w-auto"
        disabled={chosen === 0}
        loading={saving}
        onClick={() => void save()}
      >
        {chosen === unnamed.length
          ? "Confirm all"
          : `Confirm ${chosen} of ${unnamed.length}`}
      </TextureButton>
    </section>
  );
}

/** One line of context above the transcript. */
function Strip({
  icon,
  tone = "default",
  className,
  children,
}: {
  icon: React.ReactNode;
  tone?: "default" | "bad";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs leading-relaxed",
        tone === "bad"
          ? "bg-red-500/10 text-red-400"
          : "bg-alva-surface text-muted-foreground",
        className
      )}
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </div>
  );
}
