import { useState } from "react";
import RoundedMagnifier from "@solar-icons/react/search/RoundedMagnifier";
import { useIsMobile } from "@/hooks/use-mobile";
import { REVIEW_QUEUE } from "@/data/reviewQueue";
import { ReviewQueuePanel } from "@/components/review/ReviewQueuePanel";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReviewPage() {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState(REVIEW_QUEUE[0]?.id ?? "");
  const activeIndex = REVIEW_QUEUE.findIndex((item) => item.id === activeId);
  const activeItem = REVIEW_QUEUE[activeIndex] ?? REVIEW_QUEUE[0];

  const goTo = (index: number) => {
    const item = REVIEW_QUEUE[index];
    if (item) setActiveId(item.id);
  };

  if (!isMobile) {
    return (
      <div className="flex min-h-screen w-full">
        <ReviewQueuePanel
          items={REVIEW_QUEUE}
          activeId={activeId}
          onSelect={setActiveId}
        />
        {activeItem && (
          <ReviewWorkspace
            item={activeItem}
            onPrevious={activeIndex > 0 ? () => goTo(activeIndex - 1) : undefined}
            onNext={
              activeIndex < REVIEW_QUEUE.length - 1
                ? () => goTo(activeIndex + 1)
                : undefined
            }
          />
        )}
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

      {activeItem && (
        <div className="mt-4">
          <ReviewWorkspace
            item={activeItem}
            onPrevious={activeIndex > 0 ? () => goTo(activeIndex - 1) : undefined}
            onNext={
              activeIndex < REVIEW_QUEUE.length - 1
                ? () => goTo(activeIndex + 1)
                : undefined
            }
          />
        </div>
      )}

      <Card className="mt-4 border-alva-border bg-alva-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {REVIEW_QUEUE.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className="block w-full rounded-xl bg-alva-surface px-3 py-2 text-left text-sm"
            >
              {item.contributor} · {item.mode}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
