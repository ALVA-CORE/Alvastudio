import Flag from "@solar-icons/react/ui/Flag";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";
import type { ReviewVerdict } from "@/data/reviewQueue";

type ReviewActionsProps = {
  notes: string;
  onNotesChange: (value: string) => void;
  verdict: ReviewVerdict | "";
  onVerdict: (verdict: ReviewVerdict) => void;
  className?: string;
};

export function ReviewActions({
  notes,
  onNotesChange,
  verdict,
  onVerdict,
  className,
}: ReviewActionsProps) {
  return (
    <section className={cn("rounded-2xl bg-alva-card p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">Controls & actions</h3>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-muted-foreground">Reviewer notes</span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add context for the next reviewer or contributor follow-up"
          className="mt-1.5 min-h-[8.5rem] w-full resize-y rounded-xl border-0 bg-alva-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-3 flex flex-nowrap items-center justify-end gap-2">
        <TextureButton
          variant="alva"
          size="sm"
          className="w-auto shrink-0"
          onClick={() => onVerdict("approve")}
        >
          <span className="flex items-center justify-center gap-2">
            <CheckCircle size={16} weight="Bold" />
            Approve
          </span>
        </TextureButton>

        <TextureButton
          variant="destructive"
          size="sm"
          className="w-auto shrink-0"
          onClick={() => onVerdict("reject")}
        >
          <span className="flex items-center justify-center gap-2">
            <CloseCircle size={16} weight="Bold" />
            Reject
          </span>
        </TextureButton>

        <TextureButton
          variant="minimal"
          size="sm"
          className="w-auto shrink-0"
          onClick={() => onVerdict("flag")}
        >
          <span className="flex items-center justify-center gap-2">
            <Flag size={16} weight="Bold" />
            Flag for review
          </span>
        </TextureButton>
      </div>

      {verdict && (
        <p className="mt-2 text-xs text-muted-foreground">
          Selected verdict: <span className="text-foreground">{verdict}</span>
        </p>
      )}
    </section>
  );
}
