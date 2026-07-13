import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlvaSurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function AlvaSurfaceCard({ children, className }: AlvaSurfaceCardProps) {
  return (
    <div className={cn("rounded-2xl bg-alva-card p-4", className)}>
      {children}
    </div>
  );
}
