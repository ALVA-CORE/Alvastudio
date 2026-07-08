import type { ComponentProps, ReactNode } from "react";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";

type BeamSize = ComponentProps<typeof BorderBeam>["size"];

type BorderBeamCardProps = {
  children: ReactNode;
  className?: string;
  beam?: BeamSize;
  active?: boolean;
};

const beamDefaults: Record<
  NonNullable<BeamSize>,
  Pick<ComponentProps<typeof BorderBeam>, "duration" | "strength">
> = {
  md: { duration: 1.96, strength: 1 },
  sm: { duration: 1.96, strength: 0.9 },
  line: { duration: 3.1, strength: 0.85 },
  "pulse-inner": { duration: 2.3, strength: 0.85 },
  "pulse-outside": { duration: 2.3, strength: 0.9 },
};

export function BorderBeamCard({
  children,
  className,
  beam = "md",
  active = true,
}: BorderBeamCardProps) {
  const preset = beamDefaults[beam ?? "md"];

  return (
    <BorderBeam
      size={beam}
      colorVariant="mono"
      theme="dark"
      active={active}
      duration={preset.duration}
      strength={preset.strength}
      className={cn("rounded-[var(--radius)]", className)}
    >
      {children}
    </BorderBeam>
  );
}
