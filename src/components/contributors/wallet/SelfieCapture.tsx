import { useState } from "react";
import Camera from "@solar-icons/react/video/Camera";
import { cn } from "@/lib/utils";

/**
 * The longest edge of the photo we send.
 *
 * The check is a face match, not a portrait. 720px is more than enough for one
 * and keeps the JSON body around 60-90KB instead of the several megabytes a
 * modern phone camera produces, which matters on the connections this is used
 * on.
 */
const MAX_EDGE = 720;
const JPEG_QUALITY = 0.82;

/** Draws onto a canvas at a sane size and returns bare base64, no data: prefix. */
function toBase64Jpeg(image: HTMLImageElement): string {
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not read the photo.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  /* The API wants the payload only. Sending the whole data URL would put
     "data:image/jpeg;base64," through the decoder as if it were image data. */
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1] ?? "";
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * A photo of the contributor's face, for the NIN check.
 *
 * Bachs matches it against the photo on the government record, so this is not
 * an avatar: it has to be the person.
 *
 * One target, not a row of buttons. A file input with `accept="image/*"` and
 * no `capture` attribute is what opens the operating system's own sheet — Take
 * Photo, Photo Library, Browse — so a phone offers its camera without us
 * building one and a desktop opens the file picker. Setting `capture` would
 * force the camera and take that choice away, which is the opposite of what is
 * wanted here.
 *
 * The area doubles as the preview once something is chosen, and stays
 * clickable, so replacing a photo is the same gesture as adding one.
 */
export function SelfieCapture({
  value,
  onChange,
  className,
}: {
  /** Bare base64 JPEG, no data: prefix. Null until something is chosen. */
  value: string | null;
  onChange: (next: string | null) => void;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("That is not a photo. Choose an image.");
      return;
    }

    try {
      const dataUrl = await readFile(file);
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      onChange(toBase64Jpeg(image));
    } catch {
      setError("Could not read that photo. Try another one.");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
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
          "relative mx-auto flex aspect-[4/5] w-full max-w-[15rem] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-alva-surface transition-colors",
          "focus-within:border-alva-accent focus-within:ring-1 focus-within:ring-alva-accent",
          dragging ? "border-alva-accent bg-alva-accent/5" : "border-alva-border",
          value && "border-solid border-alva-border"
        )}
      >
        <input
          data-testid="selfie-file"
          type="file"
          accept="image/*"
          aria-label="Photo of your face"
          className="sr-only"
          onChange={(event) => {
            void accept(event.target.files?.[0]);
            /* Cleared so picking the same file twice still fires a change. */
            event.target.value = "";
          }}
        />

        {value ? (
          <>
            <img
              src={`data:image/jpeg;base64,${value}`}
              alt="The photo you are sending"
              className="size-full object-cover"
            />
            {/* Readable over any photo, and the only thing saying the area is
                still live once it is full. */}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6 text-center text-xs font-medium text-white">
              Tap to change
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <Camera size={26} weight="BoldDuotone" className="text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">
              Add a photo of your face
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Take one now or choose from your photos. It is matched against the
              photo on your NIN record.
            </p>
          </div>
        )}
      </label>

      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
