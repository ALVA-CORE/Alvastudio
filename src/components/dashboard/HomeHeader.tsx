import { Link } from "react-router-dom";
import UserRounded from "@solar-icons/react/users/UserRounded";
import { alvaAccentTexture } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

type HomeHeaderProps = {
  firstName: string;
  className?: string;
};

export function HomeHeader({ firstName, className }: HomeHeaderProps) {
  return (
    <header className={cn("flex items-center gap-3", className)}>
      <Link
        to="/profile"
        aria-label="Go to profile"
        className={cn(
          alvaAccentTexture("inline-flex size-10 shrink-0 items-center justify-center rounded-full"),
          "transition-transform active:scale-95"
        )}
      >
        <UserRounded
          size={20}
          weight="BoldDuotone"
          className="relative z-[1] text-alva-bg"
        />
      </Link>
      <p className="text-base text-foreground">
        <span className="text-muted-foreground">,</span> {firstName}
      </p>
    </header>
  );
}
