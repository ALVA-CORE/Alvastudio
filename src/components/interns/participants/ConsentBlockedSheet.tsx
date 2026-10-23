import ShieldWarning from "@solar-icons/react/security/ShieldWarning";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";

/**
 * Pulls the names out of the API's refusal.
 *
 * The message ends "... Not agreed: Bayo, Ngozi." We show the names rather
 * than the sentence, because the sentence also carries the session id and the
 * rule, and the intern only needs to know who.
 */
export function namesFromConsentError(message: string): string[] {
  const match = /not agreed:\s*([^.]+)/i.exec(message);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * The take cannot be saved: somebody in the room has not agreed.
 *
 * The API refuses the upload, and it is right to — a session is a recording of
 * people, and one of them said no or was never asked.
 *
 * There is nothing to tap that fixes it. A participant's consent cannot be
 * amended and a participant cannot be removed, so the only real path is a new
 * session logged without them. Saying that plainly beats a button that
 * pretends otherwise, and the missing routes are an open ask.
 */
export function ConsentBlockedSheet({
  open,
  onOpenChange,
  names,
  onStartOver,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  names: string[];
  onStartOver: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="flex items-center gap-2 text-xl text-foreground">
            <ShieldWarning size={22} weight="BoldDuotone" className="text-amber-300" />
            Not everyone has agreed
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {names.length > 0 ? (
            <div className="rounded-2xl bg-alva-surface px-4 py-3">
              <p className="text-xs text-muted-foreground">Has not agreed</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {names.join(", ")}
              </p>
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-muted-foreground">
            A session cannot be saved until everyone in the room has agreed to
            take part. Consent cannot be added after the fact, so this session
            has to be logged again without them, or with their agreement
            recorded at intake.
          </p>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Your take is still here. Nothing has been uploaded.
          </p>

          <div className="flex items-center gap-2">
            <TextureButton
              variant="minimal"
              size="lg"
              className="w-auto"
              onClick={() => onOpenChange(false)}
            >
              Back
            </TextureButton>

            <TextureButton variant="alva" size="lg" onClick={onStartOver}>
              Log the session again
            </TextureButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
