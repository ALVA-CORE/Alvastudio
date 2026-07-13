import { QUALITY_QUESTIONS, type QualityAnswers, type TriStateAnswer } from "@/data/reviewQueue";
import { cn } from "@/lib/utils";

type ReviewQualityFormProps = {
  answers: QualityAnswers;
  onChange: (answers: QualityAnswers) => void;
  className?: string;
};

const TRI_OPTIONS: Array<{ value: TriStateAnswer; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
];

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
        Five questions before a clip enters the corpus
      </p>

      <div className="mt-3 space-y-3">
        {QUALITY_QUESTIONS.map((question) => (
          <div key={question.id} className="rounded-xl bg-alva-surface p-3">
            <p className="text-xs font-medium text-foreground">{question.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TRI_OPTIONS.map((option) => {
                const isActive = answers[question.id] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTri(question.id, option.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      isActive
                        ? "bg-alva-accent text-alva-bg"
                        : "bg-alva-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
