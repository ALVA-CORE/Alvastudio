import type { ComponentType } from "react";
import type { IconProps } from "@solar-icons/react/lib/types";
import ChartSquare from "@solar-icons/react/business/ChartSquare";
import HomeSmile from "@solar-icons/react/ui/HomeSmile";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import { cn } from "@/lib/utils";

function navIcon(Icon: ComponentType<IconProps>) {
  return function NavIcon({ className, size = 22, ...props }: IconProps) {
    return (
      <Icon
        size={size}
        weight="Linear"
        className={cn("shrink-0", className)}
        {...props}
      />
    );
  };
}

export const NavMicrophone3 = navIcon(Microphone3);
export const NavChartSquare = navIcon(ChartSquare);
export const NavShieldCheck = navIcon(ShieldCheck);
export const NavHomeSmile = navIcon(HomeSmile);
