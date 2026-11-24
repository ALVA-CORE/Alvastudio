import { useState } from "react";
import { TextureButton } from "@/components/ui/texture-button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { backfillAlignments, refillDrafts } from "@/lib/api/annotations";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { formatDuration } from "@/lib/duration";

type Tool = "refill" | "align";
type Preview = { tool: Tool; count: number; detail: string };

/**
 * Two one-off jobs (24 Nov), each previewed before it runs: re-split untouched
 * drafts into subtitle-length segments, and queue exact word timings for work
 * that never got them.
 */
export function AnnotationTools() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isWorking, setWorking] = useState(false);

  const fail = (cause: unknown, fallback: string) => {
    const message = reportApiError(cause, fallback);
    if (message) alvaToast.error(message);
  };

  const open = async (tool: Tool) => {
    try {
      if (tool === "refill") {
        const result = await refillDrafts(false);
        setPreview({
          tool,
          count: result.drafts,
          detail: `${result.drafts} untouched drafts (${result.sessions} sessions, ${result.narrations} narrations) are split again into subtitle-length segments. Drafts an annotator has started aren't touched.`,
        });
      } else {
        const result = await backfillAlignments(false);
        setPreview({
          tool,
          count: result.annotations,
          detail: `${result.annotations} submitted or approved annotations get exact word timings: ${formatDuration(Math.round(result.audio_seconds))} of audio, which ElevenLabs bills.`,
        });
      }
    } catch (cause) {
      fail(cause, "Could not check that.");
    }
  };

  const run = async () => {
    if (!preview) return;
    setWorking(true);
    try {
      if (preview.tool === "refill") {
        const result = await refillDrafts(true);
        alvaToast.success(`${result.drafts} drafts split again`);
      } else {
        const result = await backfillAlignments(true);
        alvaToast.success(`${result.annotations} queued for exact timings`);
      }
      setPreview(null);
    } catch (cause) {
      fail(cause, "Could not do that.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      {/* Not modal: the dialog opens from it, and a modal menu's page lock
          would be left behind when the dialog closes. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <TextureButton variant="minimal" size="sm" className="w-auto">
            Tools
          </TextureButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => void open("refill")}>Split untouched drafts again</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void open("align")}>Get exact word timings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={preview !== null}
        onOpenChange={(next) => !next && setPreview(null)}
        tone="default"
        title={preview?.tool === "refill" ? "Split drafts again?" : "Get exact word timings?"}
        description={preview?.count ? preview.detail : "Nothing needs this right now."}
        confirmLabel={preview?.tool === "refill" ? "Split" : "Queue"}
        isPending={isWorking}
        onConfirm={() => (preview?.count ? void run() : setPreview(null))}
      />
    </>
  );
}
