import {
  QUALITY_QUESTIONS,
  TRI_STATE_OPTIONS,
  VERDICT_LABELS,
  calculateVerdictFromAnswers,
  isRubricComplete,
  type QualityAnswers,
  type TriStateAnswer,
} from "@/data/reviewQueue";
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
  className?: string;
};

export function ReviewQualityForm({
  answers,
  onChange,
  onSubmit,
  isSubmitting = false,
  readOnly = false,
  className,
}: ReviewQualityFormProps) {
  const setTri = (key: keyof Omit<QualityAnswers, "verdict">, value: TriStateAnswer) => {
    onChange({ ...answers, [key]: value });
  };

  const computedVerdict = calculateVerdictFromAnswers(answers);
  const canSubmit = isRubricComplete(answers) && !isSubmitting && !readOnly;

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
        <TextureButton
          variant="alva"
          size="default"
          className="mt-4 w-full"
          disabled={!canSubmit}
          loading={isSubmitting}
          onClick={onSubmit}
        >
          Submit review
        </TextureButton>
      )}
    </section>
  );
}
