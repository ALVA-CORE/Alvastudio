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
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { alvaToast } from "@/lib/alva-toast";
import { round1 } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

type QcResult = {
  filename: string;
  durationSec: number;
  sampleRate: number;
  snrDb: number;
  silenceRatio: number;
  clippingRatio: number;
  qualityScore: number;
  transcript: string;
  relevance: number;
};

/** Stands in for `/audio/analyze` + `/audio/transcribe` + `/audio/quality-score`. */
function fakeAnalyse(file: File): QcResult {
  // Deterministic from the filename, so the same clip reads the same twice.
  let hash = 0;
  for (let i = 0; i < file.name.length; i += 1) {
    hash = (hash * 31 + file.name.charCodeAt(i)) % 100000;
  }
  const unit = (offset: number) => ((hash + offset * 7919) % 1000) / 1000;

  return {
    filename: file.name,
    durationSec: round1(6 + unit(1) * 40),
    sampleRate: unit(2) > 0.5 ? 48000 : 16000,
    snrDb: round1(8 + unit(3) * 26),
    silenceRatio: round1(unit(4) * 0.4),
    clippingRatio: round1(unit(5) * 0.06),
    qualityScore: round1(0.45 + unit(6) * 0.5),
    transcript:
      "The traffic for Lagos island go always choke by seven a.m., especially when rain fall.",
    relevance: round1(0.5 + unit(7) * 0.5),
  };
}

function scoreTone(value: number) {
  return value >= 0.75 ? "good" : value >= 0.5 ? "pending" : "bad";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<QcResult | null>(null);
  const [isRunning, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);

  const run = async (file: File) => {
    setRunning(true);
    setResult(null);
    // Stand-in for the round trip, so the loading state is visible at all.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setResult(fakeAnalyse(file));
    setRunning(false);
    alvaToast.success("Analysis complete");
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      alvaToast.error("That is not an audio file");
      return;
    }
    void run(file);
  };

  return (
    <DesktopPageShell className="py-4" fullWidth>
      <AdminPageHeader id="audio" />

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <AlvaChartCard title="Run a clip" subtitle="Analysis, transcription and scoring">
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
            <p className="mt-3 text-sm text-foreground">Drop an audio file here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              wav, mp3, m4a or webm — nothing is stored
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
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
              Choose a file
            </TextureButton>
          </div>
        </AlvaChartCard>

        <AlvaChartCard title="Result" subtitle="What the scorer made of it">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-foreground" title={result.filename}>
                  {result.filename}
                </p>
                <AdminStatusPill tone={scoreTone(result.qualityScore)}>
                  Quality {Math.round(result.qualityScore * 100)}
                </AdminStatusPill>
              </div>

              <dl>
                <PanelRow label="Duration" value={`${result.durationSec}s`} />
                <PanelRow label="Sample rate" value={`${result.sampleRate / 1000} kHz`} />
                <PanelRow label="Signal-to-noise" value={`${result.snrDb} dB`} />
                <PanelRow
                  label="Silence"
                  value={`${Math.round(result.silenceRatio * 100)}%`}
                />
                <PanelRow
                  label="Clipping"
                  value={`${Math.round(result.clippingRatio * 100)}%`}
                />
                <PanelRow
                  label="Prompt relevance"
                  value={`${Math.round(result.relevance * 100)}%`}
                />
              </dl>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Transcript
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  {result.transcript}
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
                  : "Drop a clip on the left to see its scores."
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
    </DesktopPageShell>
  );
}
