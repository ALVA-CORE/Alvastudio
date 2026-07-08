import { BorderBeamCard } from "@/components/shared";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

export type StackCard = {
  id: number;
  name: string;
  designation: string;
  content: string;
};

type StudioPromptStackProps = {
  items: StackCard[];
  current: number;
  className?: string;
};

export function StudioPromptStack({
  items,
  current,
  className,
}: StudioPromptStackProps) {
  const len = items.length;
  const idx = ((current % len) + len) % len;
  const rotated = [...items.slice(idx), ...items.slice(0, idx)];
  const stack = rotated.slice(0, Math.min(4, rotated.length));

  return (
    <div className={cn("relative min-h-[20rem] w-full", className)}>
      {stack
        .slice()
        .reverse()
        .map((card, reversedIndex) => {
          const index = stack.length - reversedIndex - 1;
          const cardBody = (
            <div
              className={cn(
                alvaAccentTextureClass,
                "flex min-h-[20rem] w-full flex-col justify-between rounded-[28px] px-5 py-5 shadow-[0_18px_32px_rgba(0,0,0,0.28)]"
              )}
            >
              <div>
                <span className="inline-flex rounded-full bg-alva-bg/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-alva-bg/85">
                  {card.designation}
                </span>
                <p className="mt-4 text-xl font-semibold leading-tight text-alva-bg">
                  {card.content}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-alva-bg">{card.name}</p>
                <p className="mt-1 text-sm text-alva-bg/76">{card.designation}</p>
              </div>
            </div>
          );

          return (
            <div
              key={card.id}
              className="absolute inset-x-0 transition-all duration-300"
              style={{
                top: index * 10,
                transform: `scale(${1 - index * 0.05})`,
                transformOrigin: "top center",
                zIndex: stack.length - index,
              }}
            >
              {index === 0 ? (
                <BorderBeamCard beam="pulse-outside" className="rounded-[28px]">
                  {cardBody}
                </BorderBeamCard>
              ) : (
                <div className="rounded-[28px] bg-alva-surface/60 p-[1px]">
                  <div className="rounded-[27px] bg-alva-card/88 px-5 py-5 opacity-[0.92]">
                    <div>
                      <span className="inline-flex rounded-full bg-alva-bg/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
                        {card.designation}
                      </span>
                      <p className="mt-4 line-clamp-4 text-lg font-semibold leading-tight text-foreground/88">
                        {card.content}
                      </p>
                    </div>
                    <div className="mt-8">
                      <p className="text-sm font-semibold text-foreground/88">
                        {card.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {card.designation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
