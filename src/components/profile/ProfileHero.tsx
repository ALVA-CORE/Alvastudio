import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import UserCheckRounded from "@solar-icons/react/users/UserCheckRounded";
import UserSpeakRounded from "@solar-icons/react/users/UserSpeakRounded";
import { BorderBeam } from "border-beam";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import { cn } from "@/lib/utils";

type ProfileHeroProps = {
  name: string;
  phone?: string;
  role: string;
  seed: string;
  className?: string;
};

const ROLE_BADGES = {
  admin: {
    icon: ShieldCheck,
    label: "Admin",
  },
  intern: {
    icon: UserCheckRounded,
    label: "Intern",
  },
  contributor: {
    icon: UserSpeakRounded,
    label: "Contributor",
  },
} as const;

export function ProfileHero({
  name,
  phone,
  role,
  seed,
  className,
}: ProfileHeroProps) {
  const badge = ROLE_BADGES[role as keyof typeof ROLE_BADGES] ?? ROLE_BADGES.contributor;
  const BadgeIcon = badge.icon;

  return (
    <section className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative">
        <Avatar
          className={cn(
            alvaAccentTextureClass,
            "size-24 border-0 bg-transparent shadow-none ring-0"
          )}
        >
          <AvatarImage src={diceBearAvatarUrl(seed, "202020")} alt={name} />
          <AvatarFallback className="bg-alva-card text-xl font-semibold text-foreground">
            {name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute bottom-0 right-0 overflow-visible rounded-full">
                <BorderBeam
                  size="pulse-outside"
                  colorVariant="mono"
                  theme="dark"
                  strength={0.85}
                  duration={2.2}
                  borderRadius={999}
                >
                  <BorderBeam
                    size="md"
                    colorVariant="mono"
                    theme="dark"
                    strength={1}
                    duration={1.8}
                    borderRadius={999}
                  >
                    <button
                      type="button"
                      aria-label={`${badge.label} badge`}
                      className="inline-flex size-8 items-center justify-center rounded-full bg-alva-accent text-alva-bg shadow-[0_6px_18px_rgba(0,0,0,0.24)]"
                    >
                      <BadgeIcon size={16} weight="BoldDuotone" />
                    </button>
                  </BorderBeam>
                </BorderBeam>
              </div>
            </TooltipTrigger>
            <TooltipContent className="border-alva-border bg-alva-card text-foreground">
              {badge.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <h1 className="mt-4 text-xl font-semibold text-foreground">{name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {phone ?? "No phone number added yet"}
      </p>
    </section>
  );
}
