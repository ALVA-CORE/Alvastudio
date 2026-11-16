import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { cn } from "@/lib/utils";

/** shadcn's Calendar (react-day-picker 9), in the Alva palette. */
export function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-1", className)}
      classNames={{
        months: "relative flex flex-col",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium text-foreground",
        nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
        button_previous:
          "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground disabled:opacity-30",
        button_next:
          "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-center text-[11px] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "size-9 rounded-full text-foreground transition-colors hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
        selected: "[&>button]:bg-alva-accent [&>button]:font-medium [&>button]:text-alva-bg [&>button]:hover:bg-alva-accent",
        today: "[&>button]:text-alva-accent",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:pointer-events-none [&>button]:text-muted-foreground/30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <AltArrowLeft size={16} weight="Outline" />
          ) : (
            <AltArrowRight size={16} weight="Outline" />
          ),
      }}
      {...props}
    />
  );
}
