import { useRef, useState } from "react";
import Soundwave from "@solar-icons/react/video/Soundwave";
import Upload from "@solar-icons/react/arrows-action/Upload";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { PanelRow } from "@/components/shared/PanelPrimitives";
import { TextureButton } from "@/components/ui/texture-button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { alvaToast } from "@/lib/alva-toast";
import { toQcResult, type QcResult } from "@/data/admin/audioQc";
import { scoreAudio } from "@/lib/api/audio";
import { ApiError } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import { useSimulatedLoading } from "@/hooks/use-dev-ui-state";
import { cn } from "@/lib/utils";
import { NO_VALUE } from "@/lib/no-value";

function scoreTone(value: number | null) {
  if (value === null) return "neutral" as const;
  return value >= 0.75 ? "good" : value >= 0.5 ? "pending" : "bad";
}

/** A ratio as a percentage, or a dash when the scorer did not report one. */
function percent(value: number | null) {
  return value === null ? NO_VALUE : `${Math.round(value * 100)}%`;
}

/**
 * A bench for the ML endpoints.
 *
 * Its purpose is tuning thresholds before they are applied to the whole corpus:
 * run a few clips you already have an opinion about, see what the scorer says,
 * and decide where the cut-off belongs.
 *
 * The real endpoints return 503 when the optional ML stack is not installed,
 * which is a normal state and not an error — the panel below is what that
 * looks like.
 */
export default function AdminAudioPage() {
  const isLoading = useSimulatedLoading();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<QcResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isRunning, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const result = results[selected] ?? null;

  /**
   * Scores a whole drop, not one file.
   *
   * Tuning a threshold means seeing where a batch falls either side of it —
   * one clip at a time tells you about that clip. Files are run in sequence
   * rather than in parallel because the real endpoints are ML inference and
   * would queue anyway; this way the progress count is honest.
   */
  const runBatch = async (files: File[]) => {
    setRunning(true);
    setResults([]);
    setUnavailable(false);
    setProgress({ done: 0, total: files.length });

    const scored: QcResult[] = [];
    for (const [index, file] of files.entries()) {
      try {
        scored.push(toQcResult(file.name, await scoreAudio(file)));
      } catch (cause) {
        /* 503 is the ML stack not being installed, which is a normal
         * deployment state rather than a failure. Stop the batch and say so
         * once, instead of nineteen identical toasts. */
        if (cause instanceof ApiError && cause.isUnavailable) {
          setUnavailable(true);
          break;
        }
        const message = reportApiError(cause, `Could not score ${file.name}.`);
        if (message) alvaToast.error(message);
      }
      setResults([...scored]);
      setProgress({ done: index + 1, total: files.length });
    }

    setRunning(false);
    if (scored.length > 0) {
      alvaToast.success(
        scored.length === 1 ? "Analysis complete" : `${scored.length} clips scored`
      );
    }
  };

  const handleFiles = (files: FileList | null) => {
    const audio = Array.from(files ?? []).filter((file) =>
      file.type.startsWith("audio/")
    );

    if (audio.length === 0) {
      alvaToast.error("No audio files in that drop");
      return;
    }

    void runBatch(audio);
  };

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader id="audio" />

      {isLoading ? (
        <AdminPageSkeleton metrics={false} charts={2} chartColumns={2} />
      ) : (
        <>
      {/* Not an error. The ML stack is optional, and a bench that says
          "something went wrong" when it is simply not installed sends
          somebody looking for a fault that is not there. */}
      {unavailable ? (
        <div
          role="status"
          className="mt-3 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-300"
        >
          The scoring tools are not installed on this server, so nothing can be
          analysed here yet. Everything else keeps working.
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <AlvaChartCard title="Run clips" subtitle="Analysis, transcription and scoring">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex min-h-[13rem] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors",
              dragging
                ? "border-alva-accent bg-alva-accent/5"
                : "border-alva-border bg-alva-surface/40"
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-alva-card">
              <Upload size={22} weight="BoldDuotone" className="text-alva-accent" />
            </span>
            <p className="mt-3 text-sm text-foreground">Drop audio files here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              wav, mp3, m4a or webm — several at once, nothing is stored
            </p>
            {isRunning && progress.total > 1 ? (
              <p className="mt-2 text-xs tabular-nums text-alva-accent">
                {progress.done} of {progress.total} scored
              </p>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              multiple
              className="sr-only"
              onChange={(event) => handleFiles(event.target.files)}
            />

            <TextureButton
              variant="minimal"
              size="sm"
              className="mt-4 w-auto"
              loading={isRunning}
              onClick={() => inputRef.current?.click()}
            >
              Choose files
            </TextureButton>

            {results.length > 1 ? (
              <ul className="mt-4 w-full space-y-0.5 text-left">
                {results.map((entry, index) => (
                  <li key={entry.filename}>
                    <button
                      type="button"
                      onClick={() => setSelected(index)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors",
                        index === selected ? "bg-alva-card" : "hover:bg-alva-card/60"
                      )}
                    >
                      <span className="min-w-0 truncate text-xs text-foreground">
                        {entry.filename}
                      </span>
                      <AdminStatusPill tone={scoreTone(entry.qualityScore)}>
                        {Math.round(entry.qualityScore * 100)}
                      </AdminStatusPill>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </AlvaChartCard>

        <AlvaChartCard title="Result" subtitle="What the scorer made of it">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-foreground" title={result.filename}>
                  {result.filename}
                </p>
                <AdminStatusPill tone={result.accepted ? "good" : "bad"}>
                  {result.accepted ? "Accepted" : "Rejected"}
                </AdminStatusPill>
              </div>

              <dl>
                <PanelRow
                  label="Quality score"
                  value={percent(result.qualityScore)}
                />
                <PanelRow label="Duration" value={`${result.durationSec}s`} />
                {/* Trimming is what the scorer judges, so the gap between the
                    two is how much of the clip was silence at the ends. */}
                <PanelRow label="After trim" value={`${result.trimmedSec}s`} />
                <PanelRow
                  label="Signal-to-noise"
                  value={result.snrDb === null ? NO_VALUE : `${result.snrDb} dB`}
                />
                <PanelRow label="Silence" value={percent(result.silenceRatio)} />
                <PanelRow
                  label="Prompt relevance"
                  value={percent(result.relevance)}
                />
              </dl>

              {/* The reason is the point of the bench: a rejection with no
                  reason cannot move a threshold. */}
              {result.reasons.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Why
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {result.reasons.map((reason) => (
                      <li key={reason} className="text-sm text-red-400">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Transcript
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  {result.transcript ?? "Nothing transcribed."}
                </p>
              </div>
            </div>
          ) : (
            <AlvaEmptyState
              icon={<Soundwave size={20} weight="Outline" />}
              title={isRunning ? "Analysing…" : "Nothing analysed yet"}
              description={
                isRunning
                  ? "Running analysis, transcription and scoring."
                  : "Drop clips on the left to see their scores."
              }
            />
          )}
        </AlvaChartCard>
      </div>

      {/* The 503 case, shown rather than described — it is a normal state and
          the UI should not treat it as a failure. */}
      <div className="mt-2 flex items-start gap-3 rounded-2xl bg-alva-card p-4">
        <DangerTriangle
          size={18}
          weight="BoldDuotone"
          className="mt-0.5 shrink-0 text-amber-300"
        />
        <div>
          <p className="text-sm text-foreground">
            These four endpoints are optional on the server
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            <code className="text-muted-foreground">/audio/analyze</code>,{" "}
            <code className="text-muted-foreground">/audio/transcribe</code>,{" "}
            <code className="text-muted-foreground">/audio/quality-score</code> and{" "}
            <code className="text-muted-foreground">/relevance/score</code> return
            503 when the ML stack is not installed. That is a normal deployment,
            not an outage — this page will say the tools are unavailable rather
            than showing an error.
          </p>
        </div>
      </div>
        </>
      )}
    </DesktopPageShell>
  );
}
