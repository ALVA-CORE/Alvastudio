import {
  QUALITY_QUESTIONS,
  TRI_STATE_OPTIONS,
  type QualityAnswers,
  type TriStateAnswer,
} from "@/data/reviewQueue";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ReviewQualityFormProps = {
  answers: QualityAnswers;
  onChange: (answers: QualityAnswers) => void;
  className?: string;
};

export function ReviewQualityForm({
  answers,
  onChange,
  className,
}: ReviewQualityFormProps) {
  const setTri = (key: keyof Omit<QualityAnswers, "verdict">, value: TriStateAnswer) => {
    onChange({ ...answers, [key]: value });
  };

  return (
    <section className={cn("rounded-2xl bg-alva-card p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">Quality rubric</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Answer each question before submitting a verdict
      </p>

      <div className="mt-3">
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
                      className="border-alva-border text-alva-accent"
                    />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {index < QUALITY_QUESTIONS.length - 1 && (
              <Separator className="mx-2 bg-alva-border" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
