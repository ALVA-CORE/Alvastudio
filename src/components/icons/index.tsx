import type { ComponentType, SVGProps } from "react";
import type { IconProps } from "@solar-icons/react/lib/types";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import AltArrowUp from "@solar-icons/react/arrows/AltArrowUp";
import SolarArrowLeft from "@solar-icons/react/arrows/ArrowLeft";
import SolarArrowRight from "@solar-icons/react/arrows/ArrowRight";
import SortVertical from "@solar-icons/react/arrows/SortVertical";
import CheckRead from "@solar-icons/react/messages/CheckRead";
import Magnifer from "@solar-icons/react/search/Magnifer";
import Sidebar from "@solar-icons/react/it/Sidebar";
import CloseSquare from "@solar-icons/react/ui/CloseSquare";
import MenuDots from "@solar-icons/react/ui/MenuDots";
import { cn } from "@/lib/utils";

type SolarIcon = ComponentType<IconProps>;

function solarIcon(Icon: SolarIcon) {
  return function IconComponent({
    className,
    size,
    weight = "Linear",
    ...props
  }: IconProps) {
    return (
      <Icon
        size={size ?? "1em"}
        weight={weight}
        className={cn("inline-block shrink-0", className)}
        {...props}
      />
    );
  };
}

/** Lucide-compatible names — import from `@/components/icons` only. */
export const X = solarIcon(CloseSquare);
export const Check = solarIcon(CheckRead);
export const ChevronDown = solarIcon(AltArrowDown);
export const ChevronUp = solarIcon(AltArrowUp);
export const ChevronLeft = solarIcon(AltArrowLeft);
export const ChevronRight = solarIcon(AltArrowRight);
export const ChevronDownIcon = ChevronDown;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const ArrowLeft = solarIcon(SolarArrowLeft);
export const ArrowRight = solarIcon(SolarArrowRight);
export const ArrowLeftIcon = ArrowLeft;
export const ArrowRightIcon = ArrowRight;
export const Search = solarIcon(Magnifer);
export const MoreHorizontal = solarIcon(MenuDots);
export const PanelLeft = solarIcon(Sidebar);
export const GripVertical = solarIcon(SortVertical);

export function Circle({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("inline-block shrink-0 fill-current", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export function Dot({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("inline-block shrink-0 fill-current", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}
