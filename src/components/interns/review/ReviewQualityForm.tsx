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
  className?: string;
};

export function ReviewQualityForm({
  answers,
  onChange,
  onSubmit,
  isSubmitting = false,
  className,
}: ReviewQualityFormProps) {
  const setTri = (key: keyof Omit<QualityAnswers, "verdict">, value: TriStateAnswer) => {
    onChange({ ...answers, [key]: value });
  };

  const computedVerdict = calculateVerdictFromAnswers(answers);
  const canSubmit = isRubricComplete(answers) && !isSubmitting;

  return (
    <section className={cn("flex h-full flex-col rounded-2xl bg-alva-card p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">Quality rubric</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Complete all questions — the outcome is calculated automatically
      </p>

      <div className="mt-3 flex-1">
        {QUALITY_QUESTIONS.map((question, index) => (
          <div key={question.id}>
            <div className="py-3">
              <p className="text-sm text-foreground">{question.label}</p>
              <RadioGroup
                value={answers[question.id]}
                onValueChange={(value) =>
                  setTri(question.id, value as TriStateAnswer)
                }
                className="mt-2 flex flex-wrap gap-4"
              >
                {TRI_STATE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`${question.id}-${option.value}`}
                    className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                  >
                    <RadioGroupItem
                      id={`${question.id}-${option.value}`}
                      value={option.value}
                      className="border-alva-border text-muted-foreground data-[state=checked]:border-alva-accent data-[state=checked]:text-alva-accent"
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
          Calculated outcome:{" "}
          <span className="font-medium text-foreground">
            {VERDICT_LABELS[computedVerdict]}
          </span>
        </p>
      )}

      <TextureButton
        variant="alva"
        size="default"
        className="mt-4 w-full"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {isSubmitting ? "Submitting…" : "Submit review"}
      </TextureButton>
    </section>
  );
}
