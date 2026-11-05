import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Gallery from "@solar-icons/react/video/Gallery";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { BeamInput } from "@/components/auth/BeamInput";
import { RichBodyEditor } from "@/components/admin/communications/RichBodyEditor";
import { RecipientsField } from "@/components/admin/communications/RecipientsField";
import { toMarkdown } from "@/lib/admin/richBody";
import { uploadCommunicationImage } from "@/lib/api/communications";
import { reportApiError } from "@/lib/api/reportApiError";
import { COMMUNICATION_LIMITS } from "@/lib/api/communications";
import { actionUrlProblem, DEFAULT_ACTION_URL } from "@/lib/admin/emailTemplate";
import { alvaToast } from "@/lib/alva-toast";
import type { ComposerFields } from "@/hooks/useCommsComposer";
import type { DirectoryContributor } from "@/hooks/useContributorDirectory";
import { cn } from "@/lib/utils";

const HERO_MAX_BYTES = 5 * 1024 * 1024;

type Set_ = <K extends keyof ComposerFields>(key: K, value: ComposerFields[K]) => void;

export function ComposeTab({
  fields,
  set,
  contributors,
}: {
  fields: ComposerFields;
  set: Set_;
  contributors: DirectoryContributor[];
}) {
  const linkProblem = fields.link.trim() ? actionUrlProblem(fields.link.trim()) : null;

  /* Only the latest drop counts: an upload that finishes after a newer one
     started, or after the image was removed, is ignored. */
  const uploads = useRef(0);

  /**
   * Shown at once from the file, uploaded straight away, then swapped for
   * the server's copy: re-encoded, at most 1200px wide, transparency filled
   * with the card's dark. That copy is what inboxes will fetch, so the
   * preview shows it rather than the original.
   */
  const pickHero = (file: File) => {
    const seq = ++uploads.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (seq === uploads.current) set("hero", String(reader.result));
    };
    reader.readAsDataURL(file);
    set("heroId", null);
    set("heroUploading", true);
    set("heroProgress", 0);
    uploadCommunicationImage(file, (fraction) => {
      if (seq === uploads.current) set("heroProgress", fraction);
    })
      .then((image) => {
        if (seq !== uploads.current) return;
        set("heroId", image.id);
        set("hero", image.url);
      })
      .catch((cause: unknown) => {
        if (seq !== uploads.current) return;
        set("hero", null);
        alvaToast.error(reportApiError(cause, "Could not upload that image.") ?? "Could not upload that image.");
      })
      .finally(() => {
        if (seq === uploads.current) set("heroUploading", false);
      });
  };

  const clearHero = () => {
    uploads.current += 1;
    set("hero", null);
    set("heroId", null);
    set("heroUploading", false);
  };

  return (
    <div className="space-y-3">
      {/* To and the header as an inbox has them: label and field on a line,
          a hairline between, no boxes. */}
      <div className="divide-y divide-alva-border border-b border-alva-border">
        <RecipientsField fields={fields} set={set} contributors={contributors} />

        <input
          aria-label="Header"
          placeholder="Header"
          value={fields.header}
          maxLength={COMMUNICATION_LIMITS.subject}
          onChange={(event) => set("header", event.target.value)}
          className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <HeroDrop
        value={fields.hero}
        uploading={fields.heroUploading}
        onPick={pickHero}
        onClear={clearHero}
      />

      <RichBodyEditor
        value={fields.bodyDoc}
        onChange={(doc) => {
          set("bodyDoc", doc);
          set("body", toMarkdown(doc));
        }}
      />

      <div className="grid grid-cols-[2fr_3fr] gap-2">
        <BeamInput
          label="Button"
          value={fields.button}
          maxLength={COMMUNICATION_LIMITS.actionLabel}
          onChange={(event) => set("button", event.target.value)}
        />
        <BeamInput
          label={fields.link.trim() && fields.link.trim() !== DEFAULT_ACTION_URL ? "Link · changed" : "Link"}
          inputMode="url"
          value={fields.link}
          aria-invalid={Boolean(linkProblem) || undefined}
          className={cn(linkProblem && "text-destructive")}
          maxLength={COMMUNICATION_LIMITS.actionUrl}
          onChange={(event) => set("link", event.target.value)}
        />
      </div>

    </div>
  );
}

/** The types the upload route takes, checked here first so a wrong one is
 *  refused before it is sent. */
const HERO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Drop an image on it, or press it to choose one. */
function HeroDrop({
  value,
  uploading,
  onPick,
  onClear,
}: {
  value: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!HERO_TYPES.includes(file.type)) {
      alvaToast.error("PNG, JPEG or WebP");
      return;
    }
    if (file.size > HERO_MAX_BYTES) {
      alvaToast.error("Images up to 5 MB");
      return;
    }
    onPick(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "relative h-28 overflow-hidden rounded-2xl border border-dashed transition-colors",
        over ? "border-alva-accent bg-alva-accent/[0.06]" : "border-alva-border bg-alva-surface"
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <AnimatePresence initial={false} mode="wait">
        {value ? (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <img
              src={value}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-opacity duration-300",
                uploading && "animate-pulse opacity-60"
              )}
            />
            <button
              type="button"
              aria-label="Remove image"
              onClick={onClear}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/90 backdrop-blur transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              <CloseCircle size={18} weight="Bold" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="empty"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            aria-label="Hero image"
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent"
          >
            <Gallery size={22} weight="Outline" />
            <span className="text-xs">Hero image</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
