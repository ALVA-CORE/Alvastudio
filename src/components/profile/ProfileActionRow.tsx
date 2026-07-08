import type { ReactNode } from "react";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ProfileActionRowProps = {
  icon: ReactNode;
  title: string;
  sheetTitle: string;
  sheetDescription?: string;
  children: ReactNode;
  className?: string;
  hideDivider?: boolean;
};

export function ProfileActionRow({
  icon,
  title,
  sheetTitle,
  sheetDescription,
  children,
  className,
  hideDivider = false,
}: ProfileActionRowProps) {
  return (
    <Sheet>
      <div className={cn("relative", className)}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="alva-row flex w-full items-center gap-3 py-4 text-left"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
              {icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{title}</p>
            </div>

            <AltArrowRight
              size={18}
              weight="Outline"
              className="shrink-0 text-muted-foreground"
            />
          </button>
        </SheetTrigger>

        {!hideDivider && <Separator className="ml-[3.25rem] w-[calc(100%-3.25rem)]" />}
      </div>

      <SheetContent
        side="bottom"
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-8"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle>{sheetTitle}</SheetTitle>
          {sheetDescription ? (
            <SheetDescription>{sheetDescription}</SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="mt-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
