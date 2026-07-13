import RoundedMagnifier from "@solar-icons/react/search/RoundedMagnifier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const MOCK_QUEUE = [
  { id: "1", contributor: "Ada O.", mode: "Prompt reader", duration: "0:42" },
  { id: "2", contributor: "Kemi A.", mode: "Stimuli", duration: "1:08" },
  { id: "3", contributor: "Tunde M.", mode: "Prompt reader", duration: "0:55" },
  { id: "4", contributor: "Ngozi E.", mode: "Stimuli", duration: "1:22" },
];

export default function ReviewPage() {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="flex min-h-[calc(100vh-0px)]">
        <aside className="w-[min(22rem,34%)] shrink-0 border-r border-alva-border bg-alva-surface p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-alva-card">
              <RoundedMagnifier size={18} weight="BoldDuotone" className="text-alva-accent" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Review</h1>
              <p className="text-xs text-muted-foreground">Intern QA queue</p>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {MOCK_QUEUE.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    index === 0
                      ? "border-alva-accent/35 bg-alva-card"
                      : "border-alva-border bg-alva-card/60 hover:bg-alva-card"
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{item.contributor}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.mode} · {item.duration}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-w-0 flex-1 justify-center p-6">
          <div className="flex w-full max-w-3xl flex-col gap-2">
            <div className="rounded-2xl border border-alva-border bg-alva-card p-6">
            <p className="text-sm text-muted-foreground">Now reviewing</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Ada O.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Prompt reader · 0:42</p>

            <div className="mt-6 flex h-28 items-center justify-center rounded-xl border border-dashed border-alva-border bg-alva-surface text-sm text-muted-foreground">
              Audio player
            </div>
          </div>

          <Card className="border-alva-border bg-alva-card">
            <CardHeader>
              <CardTitle className="text-base">Quality form</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Five-question review form will live here.
            </CardContent>
          </Card>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2">
        <RoundedMagnifier size={22} weight="BoldDuotone" className="text-alva-accent" />
        <div>
          <h1 className="font-display text-2xl">Review</h1>
          <p className="text-sm text-muted-foreground">Intern QA queue</p>
        </div>
      </div>

      <Card className="mt-6 border-alva-border bg-alva-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Queue</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Audio player + 5-question quality form.
        </CardContent>
      </Card>
    </div>
  );
}
