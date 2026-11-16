import ChatRoundDots from "@solar-icons/react/messages/ChatRoundDots";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";
import { rememberStimuliIntro } from "@/lib/stimuli-intro";

/**
 * Stimuli is not reading. The card is a topic to talk about in your own
 * words, and somebody who reads it out loud records nothing we can use, so
 * it is said once, the first time they switch, in the layout every other
 * one-message sheet here uses.
 */
export function StimuliIntroSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => {
    rememberStimuliIntro();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-10"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
            <ChatRoundDots size={30} weight="BoldDuotone" className="text-alva-accent" />
          </span>

          <SheetHeader className="mt-4 space-y-2">
            <SheetTitle className="text-xl text-foreground">Talk, don't read</SheetTitle>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Each card gives you a topic. Talk about it in your own words, like you're telling a
              friend. Don't read the card out loud.
            </p>
          </SheetHeader>

          <TextureButton variant="alva" size="lg" className="mt-6 w-auto px-10" onClick={close}>
            Got it
          </TextureButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
