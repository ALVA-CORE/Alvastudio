import {
  QUALITY_QUESTIONS,
  TRI_STATE_OPTIONS,
  VERDICT_LABELS,
  calculateVerdictFromAnswers,
  isRubricComplete,
  type QualityAnswers,
  type TriStateAnswer,
} from "@/data/reviewQueue";
import Flag from "@solar-icons/react/ui/Flag";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

type ReviewQualityFormProps = {
  answers: QualityAnswers;
  onChange: (answers: QualityAnswers) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  /**
   * A verdict has been given, so this is a record rather than a form.
   *
   * A submitted review is the account of a decision that already changed a
   * contributor's clip and their counts. Leaving the radios live invited an
   * intern to change what they had said with no way to send it, and the API
   * refuses a second review anyway.
   */
  readOnly?: boolean;
  /** A stimulus narration: one more question, about pay. */
  askReadAsPrompt?: boolean;
  /** Opens the junk flag, which is sent as a rejection with reasons. */
  onFlag?: () => void;
  className?: string;
};

export function ReviewQualityForm({
  answers,
  onChange,
  onSubmit,
  isSubmitting = false,
  readOnly = false,
  askReadAsPrompt = false,
  onFlag,
  className,
}: ReviewQualityFormProps) {
  const setTri = (key: keyof Omit<QualityAnswers, "verdict">, value: TriStateAnswer) => {
    onChange({ ...answers, [key]: value });
  };

  const computedVerdict = calculateVerdictFromAnswers(answers);
  const canSubmit =
    isRubricComplete(answers) && (!askReadAsPrompt || Boolean(answers.readAsPrompt)) && !isSubmitting && !readOnly;

  return (
    <section className={cn("flex h-full min-w-0 flex-col rounded-2xl bg-alva-card p-3 sm:p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">
        {readOnly ? "Your answers" : "Quality rubric"}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {readOnly
          ? "This review has been submitted and cannot be changed."
          : "Complete all questions, the outcome is calculated automatically"}
      </p>

      <div className="mt-3 flex-1">
        {QUALITY_QUESTIONS.map((question, index) => (
          <div key={question.id}>
            <div className="py-3">
              <p className="text-sm text-foreground">{question.label}</p>
              {/* Still radios when read-only, rather than a line of text:
                  it is the same shape the intern filled in, so what they
                  chose is read the same way they chose it. Disabled, and the
                  unchosen options fade so the answer carries. */}
              <RadioGroup
                value={answers[question.id]}
                disabled={readOnly}
                onValueChange={(value) =>
                  setTri(question.id, value as TriStateAnswer)
                }
                className="mt-2 flex flex-wrap gap-4"
              >
                {TRI_STATE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`${question.id}-${option.value}`}
                    className={cn(
                      "flex items-center gap-2 text-sm text-foreground",
                      readOnly
                        ? answers[question.id] === option.value
                          ? "cursor-default"
                          : "cursor-default text-muted-foreground/50"
                        : "cursor-pointer"
                    )}
                  >
                    <RadioGroupItem
                      id={`${question.id}-${option.value}`}
                      value={option.value}
                      disabled={readOnly}
                      className="border-alva-border text-muted-foreground data-[state=checked]:border-alva-accent data-[state=checked]:text-alva-accent disabled:opacity-100"
                    />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {index < QUALITY_QUESTIONS.length - 1 && (
              <div className="mx-2 h-px bg-alva-border" />
            )}
          </div>
        ))}
      </div>

      {askReadAsPrompt ? (
        <div className="py-3">
          <div className="mx-2 mb-3 h-px bg-alva-border" />
          <p className="text-sm text-foreground">Was the topic read out like a prompt instead of narrated?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Yes pays ₦10, as a sentence. It doesn't change the outcome.</p>
          <RadioGroup
            value={answers.readAsPrompt ?? ""}
            disabled={readOnly}
            onValueChange={(value) => onChange({ ...answers, readAsPrompt: value as "yes" | "no" })}
            className="mt-2 flex flex-wrap gap-4"
          >
            {(["yes", "no"] as const).map((value) => (
              <label
                key={value}
                htmlFor={`readAsPrompt-${value}`}
                className={cn("flex items-center gap-2 text-sm text-foreground", readOnly ? "cursor-default" : "cursor-pointer")}
              >
                <RadioGroupItem
                  id={`readAsPrompt-${value}`}
                  value={value}
                  disabled={readOnly}
                  className="border-alva-border text-muted-foreground data-[state=checked]:border-alva-accent data-[state=checked]:text-alva-accent disabled:opacity-100"
                />
                {value === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      {computedVerdict && (
        <p className="mt-2 text-xs text-muted-foreground">
          {readOnly ? "Outcome: " : "Calculated outcome: "}
          <span className="font-medium text-foreground">
            {VERDICT_LABELS[computedVerdict]}
          </span>
        </p>
      )}

      {/* No button at all once it is submitted. A disabled "Submit review"
          reads as something that might still become pressable. */}
      {readOnly ? null : (
        <div className="mt-4 flex items-center gap-2">
          {onFlag ? (
            <TextureButton
              variant="minimal"
              size="default"
              className="w-auto shrink-0"
              disabled={isSubmitting}
              onClick={onFlag}
            >
              <Flag size={15} weight="Outline" />
              Flag
            </TextureButton>
          ) : null}
          <TextureButton
            variant="alva"
            size="default"
            className="min-w-0 flex-1"
            disabled={!canSubmit}
            loading={isSubmitting}
            onClick={onSubmit}
          >
            Submit review
          </TextureButton>
        </div>
      )}
    </section>
  );
}
