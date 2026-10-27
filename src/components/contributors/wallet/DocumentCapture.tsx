import { useState } from "react";
import DocumentIcon from "@solar-icons/react/notes/Document";
import { encodeDocument, ACCEPTED_TYPES, DocumentError, type EncodedDocument } from "@/lib/identity/document";
import { cn } from "@/lib/utils";

/**
 * One side of an identity document.
 *
 * This replaces the selfie target. It is not the same job: a selfie was a
 * face match and any reasonable snap would do, while this is a document
 * somebody has to **read**, so the frame is wide, the preview is large
 * enough to check before sending, and a wrong photo is swapped with the same
 * tap that added it.
 *
 * One target, not a row of buttons. A file input with no `capture` attribute
 * is what opens the operating system's own sheet — Take Photo, Photo Library,
 * Browse — so a phone offers its camera without us building one, a desktop
 * opens a file picker, and somebody with a scanned PDF already on the device
 * can use it. Setting `capture` would force the camera and take all of that
 * away.
 *
 * The file never leaves this component except as base64 handed to the caller.
 * Nothing is written to storage, and nothing is logged.
 */
export function DocumentCapture({
  value,
  onChange,
  label,
  hint,
  testId,
  className,
}: {
  value: EncodedDocument | null;
  onChange: (next: EncodedDocument | null) => void;
  label: string;
  hint: string;
  testId: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setReading(true);

    try {
      onChange(await encodeDocument(file));
    } catch (cause) {
      /* Our own messages say what to do instead; anything else would be a
         bug here rather than a bad file, so it does not pretend otherwise. */
      setError(
        cause instanceof DocumentError
          ? cause.message
          : "Could not read that file. Try another one."
      );
    } finally {
      setReading(false);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex aspect-[8/5] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-alva-surface transition-colors",
          "focus-within:border-alva-accent focus-within:ring-1 focus-within:ring-alva-accent",
          dragging ? "border-alva-accent bg-alva-accent/5" : "border-alva-border",
          value && "border-solid border-alva-border"
        )}
      >
        <input
          data-testid={testId}
          type="file"
          accept={ACCEPTED_TYPES}
          aria-label={label}
          className="sr-only"
          onChange={(event) => {
            void accept(event.target.files?.[0]);
            /* Cleared so picking the same file twice still fires a change. */
            event.target.value = "";
          }}
        />

        {value ? (
          <>
            {value.previewUrl ? (
              <img
                src={value.previewUrl}
                alt={`${label}, as it will be sent`}
                className="size-full object-cover"
              />
            ) : (
              /* A PDF has nothing to show inline, so it shows its name —
                 which is the only thing that tells somebody whether they
                 picked the right one of four scans. */
              <div className="flex flex-col items-center gap-1.5 px-6 text-center">
                <DocumentIcon size={24} weight="BoldDuotone" className="text-alva-accent" />
                <p className="max-w-full truncate text-xs font-medium text-foreground">
                  {value.name}
                </p>
                <p className="text-[11px] text-muted-foreground">PDF attached</p>
              </div>
            )}

            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-center text-[11px] font-medium text-white">
              Tap to change
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-5 text-center">
            <DocumentIcon size={22} weight="BoldDuotone" className="text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">
              {reading ? "Reading…" : label}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
          </div>
        )}
      </label>

      {error ? (
        <p role="alert" className="text-center text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
