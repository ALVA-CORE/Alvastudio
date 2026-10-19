import { Link } from "react-router-dom";
import Bell from "@solar-icons/react/notifications/Bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import { cn } from "@/lib/utils";

type HomeHeaderProps = {
  firstName: string;
  /** Same seed the profile uses, so one person has one face across the app. */
  avatarSeed?: string;
  fullName?: string;
  className?: string;
};

export function HomeHeader({
  firstName,
  avatarSeed,
  fullName,
  className,
}: HomeHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/profile"
          aria-label="Go to profile"
          className="shrink-0 rounded-full transition-transform active:scale-95"
        >
          <Avatar className="size-10 border border-alva-border">
            <AvatarImage
              src={diceBearAvatarUrl(avatarSeed ?? firstName, "202020")}
              alt={fullName ?? firstName}
            />
            <AvatarFallback className="bg-alva-surface text-xs font-medium text-foreground">
              {(fullName ?? firstName).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <p className="truncate text-base text-foreground">
          <span className="text-muted-foreground">How far,</span> {firstName}
        </p>
      </div>

      <Link
        to="/contributor/notifications"
        aria-label="Notifications"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-surface text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell size={22} weight="Outline" />
      </Link>
    </header>
  );
}
