import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Gallery from "@solar-icons/react/video/Gallery";
import { BeamInput } from "@/components/auth/BeamInput";
import { RichBodyEditor } from "@/components/admin/communications/RichBodyEditor";
import { RecipientsField } from "@/components/admin/communications/RecipientsField";
import { toMarkdown } from "@/lib/admin/richBody";
import { uploadCommunicationImage } from "@/lib/api/communications";
import { reportApiError } from "@/lib/api/reportApiError";
import { COMMUNICATION_LIMITS } from "@/lib/api/communications";
import {
  actionUrlProblem,
  COMMUNICATION_HERO,
  DEFAULT_ACTION_URL,
  EVERYDAY_HERO,
} from "@/lib/admin/emailTemplate";
import { alvaToast } from "@/lib/alva-toast";
import type { ComposerFields } from "@/hooks/useCommsComposer";
import type { DirectoryContributor } from "@/hooks/useContributorDirectory";
import { cn } from "@/lib/utils";

const HERO_MAX_BYTES = 5 * 1024 * 1024;

const EVERYDAY_KEY = "alva-comms-everyday-image";

/** The uploaded copy of the everyday image, if this browser has made one. */
function rememberedEveryday(): { id: string; url: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(EVERYDAY_KEY) ?? "null");
    return value && typeof value.id === "string" && typeof value.url === "string" ? value : null;
  } catch {
    return null;
  }
}

function rememberEveryday(image: { id: string; url: string }) {
  try {
    localStorage.setItem(EVERYDAY_KEY, JSON.stringify({ id: image.id, url: image.url }));
  } catch {
    /* Private window or full storage: it is uploaded again next time. */
  }
}

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
  const pickHero = (file: File, choice: HeroChoice = "custom", shownAs?: string) => {
    const seq = ++uploads.current;
    set("heroChoice", choice);
    if (shownAs) {
      set("hero", shownAs);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (seq === uploads.current) set("hero", String(reader.result));
      };
      reader.readAsDataURL(file);
    }
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
        if (choice === "everyday") rememberEveryday(image);
      })
      .catch((cause: unknown) => {
        if (seq !== uploads.current) return;
        set("hero", null);
        set("heroChoice", "brand");
        alvaToast.error(reportApiError(cause, "Could not upload that image.") ?? "Could not upload that image.");
      })
      .finally(() => {
        if (seq === uploads.current) set("heroUploading", false);
      });
  };

  /**
   * The brand image is the server's own default: nothing to upload, and no
   * id to send. The everyday image is the other one the templates use; the
   * API takes only uploaded images, so a copy of it is uploaded once and its
   * id kept in this browser for next time. Uploaded images are never
   * deleted, so a kept id stays good.
   */
  const pickPreset = (preset: "brand" | "everyday") => {
    const seq = ++uploads.current;
    set("heroUploading", false);
    if (preset === "brand") {
      set("heroChoice", "brand");
      set("hero", null);
      set("heroId", null);
      return;
    }
    const kept = rememberedEveryday();
    if (kept) {
      set("heroChoice", "everyday");
      set("heroId", kept.id);
      set("hero", kept.url);
      return;
    }
    set("heroChoice", "everyday");
    set("hero", EVERYDAY_HERO);
    set("heroUploading", true);
    set("heroProgress", 0);
    fetch(EVERYDAY_HERO)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      })
      .then((blob) => {
        /* Another choice made while it downloaded wins. */
        if (seq !== uploads.current) return;
        pickHero(new File([blob], "everyday.png", { type: blob.type || "image/png" }), "everyday", EVERYDAY_HERO);
      })
      .catch(() => {
        if (seq !== uploads.current) return;
        set("heroUploading", false);
        set("heroChoice", "brand");
        set("hero", null);
        alvaToast.error("Could not load that image");
      });
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
        choice={fields.heroChoice}
        uploading={fields.heroUploading}
        onPreset={pickPreset}
        onPick={pickHero}
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

export type HeroChoice = "brand" | "everyday" | "custom";

const PRESETS = [
  { value: "brand", label: "Brand image", src: COMMUNICATION_HERO },
  { value: "everyday", label: "Everyday image", src: EVERYDAY_HERO },
] as const;

/**
 * The email's image: one of the two the templates already use, or your own.
 *
 * All in the one area. It shows the image that will be sent; the round
 * thumbnails in its corner switch between the brand image, the everyday
 * image and an upload, and a file dropped anywhere on it is taken too.
 */
function HeroDrop({
  value,
  choice,
  uploading,
  onPreset,
  onPick,
}: {
  value: string | null;
  choice: HeroChoice;
  uploading: boolean;
  onPreset: (preset: "brand" | "everyday") => void;
  onPick: (file: File) => void;
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

  const shown = value ?? COMMUNICATION_HERO;

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
        "relative h-32 overflow-hidden rounded-2xl border transition-colors",
        over ? "border-dashed border-alva-accent" : "border-alva-border"
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
      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={shown}
          src={shown}
          alt=""
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: uploading ? 0.6 : 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn("absolute inset-0 h-full w-full object-cover", uploading && "animate-pulse")}
        />
      </AnimatePresence>

      {over ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          <Gallery size={24} weight="Bold" />
        </div>
      ) : null}

      <div
        role="radiogroup"
        aria-label="Hero image"
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/55 p-1 backdrop-blur"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={choice === preset.value}
            aria-label={preset.label}
            onClick={() => onPreset(preset.value)}
            className={cn(
              "size-8 overflow-hidden rounded-full ring-2 ring-offset-0 transition focus-visible:outline-none",
              choice === preset.value ? "ring-alva-accent" : "ring-transparent opacity-70 hover:opacity-100"
            )}
          >
            <img src={preset.src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={choice === "custom"}
          aria-label="Upload an image"
          onClick={() => input.current?.click()}
          className={cn(
            "flex size-8 items-center justify-center overflow-hidden rounded-full bg-alva-surface text-foreground ring-2 transition focus-visible:outline-none",
            choice === "custom" ? "ring-alva-accent" : "ring-transparent hover:text-alva-accent"
          )}
        >
          {choice === "custom" && value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <Gallery size={15} weight="Bold" />
          )}
        </button>
      </div>
    </div>
  );
}
