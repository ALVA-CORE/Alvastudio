import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import QuestionCircle from "@solar-icons/react/ui/QuestionCircle";
import type { IconProps, IconWeight } from "@solar-icons/react/lib/types";
import HomeSmile from "@solar-icons/react/ui/HomeSmile";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import UserRounded from "@solar-icons/react/users/UserRounded";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import { ContributorGuideSheet } from "@/components/contributors/guide/ContributorGuideSheet";
import { useGuideIntro } from "@/components/contributors/guide/useGuideIntro";
import { cn } from "@/lib/utils";
import { alvaAccentTextureClass } from "@/lib/alva-texture";

type NavId = "home" | "record" | "review" | "profile";

type NavItem = {
  id: NavId;
  label: string;
  path: string;
  icon: ComponentType<IconProps>;
  internOnly?: boolean;
};

const contributorNav: NavItem[] = [
  { id: "home", label: "Home", path: "/contributor/dashboard", icon: HomeSmile },
  { id: "record", label: "Record", path: "/contributor/studio", icon: Microphone3 },
  { id: "profile", label: "Profile", path: "/contributor/profile", icon: UserRounded },
];

const staffMobileNav: NavItem[] = [
  { id: "home", label: "Home", path: "/intern/dashboard", icon: HomeSmile },
  { id: "record", label: "Record", path: "/intern/record", icon: Microphone3 },
  { id: "review", label: "Review", path: "/intern/review", icon: Clipboard },
  { id: "profile", label: "Profile", path: "/intern/profile", icon: UserRounded },
];

function getActiveNav(pathname: string, isStaff: boolean): NavId {
  if (pathname.startsWith("/intern/record") || pathname.startsWith("/contributor/studio") || pathname.startsWith("/studio")) {
    return "record";
  }
  if (pathname.startsWith("/intern/review") || pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/intern/profile") || pathname.startsWith("/contributor/profile") || pathname.startsWith("/profile")) {
    return "profile";
  }
  if (pathname.startsWith("/intern/dashboard") || pathname.startsWith("/contributor/dashboard") || pathname.startsWith("/dashboard")) {
    return "home";
  }
  return isStaff ? "home" : "home";
}

type FloatingBottomNavProps = {
  isStaff?: boolean;
};

function NavIcon({
  Icon,
  active,
}: {
  Icon: ComponentType<IconProps>;
  active: boolean;
}) {
  const weight: IconWeight = active ? "BoldDuotone" : "Outline";

  return (
    <Icon
      size={20}
      weight={weight}
      className={cn("shrink-0", active ? "text-alva-bg" : "currentColor")}
    />
  );
}

export function FloatingBottomNav({ isStaff = false }: FloatingBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = getActiveNav(location.pathname, isStaff);
  const items = isStaff ? staffMobileNav : contributorNav;
  const [guideOpen, setGuideOpen] = useState(false);

  /* The one time it opens by itself. Contributors only, and only until it
     has been read. */
  const intro = useGuideIntro(!isStaff);

  useEffect(() => {
    if (intro.due) setGuideOpen(true);
  }, [intro.due]);

  const onRead = useCallback(() => intro.markRead(), [intro]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex items-center justify-center gap-2 px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
      <nav
        aria-label="Main navigation"
        className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-alva-surface p-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/5"
      >
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center rounded-full transition-all duration-300 ease-out",
                isActive
                  ? cn(
                      "relative gap-2 rounded-full px-3 py-2",
                      alvaAccentTextureClass
                    )
                  : "px-2.5 py-2 text-muted-foreground hover:text-foreground"
              )}
            >
              <NavIcon Icon={item.icon} active={isActive} />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ease-out",
                  isActive ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Detached on purpose.
          It is not a place in the app — it opens over whatever you are doing
          and closes back onto it, so putting it inside the pill would make a
          destination of something that never changes the page. Set apart, it
          reads as what it is: help, always within reach of a thumb.

          Contributors only. Staff have their own guidance and this one is
          written for somebody recording. */}
      {!isStaff ? (
        <>
          <button
            type="button"
            aria-label="How to get your recordings approved"
            aria-haspopup="dialog"
            aria-expanded={guideOpen}
            onClick={() => setGuideOpen(true)}
            className={cn(
              "pointer-events-auto relative flex size-[46px] shrink-0 items-center justify-center rounded-full",
              "bg-alva-surface shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/5",
              "transition-colors",
              guideOpen
                ? "text-alva-accent"
                : /* Accent while there is still something to read, so the
                     one unread thing on screen is findable. Grey once it
                     has been, because by then it is a reference and not a
                     notification. */
                  intro.unread
                  ? "text-alva-accent"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            <QuestionCircle
              size={20}
              weight={guideOpen || intro.unread ? "BoldDuotone" : "Outline"}
            />
          </button>

          <ContributorGuideSheet
            open={guideOpen}
            onOpenChange={setGuideOpen}
            /* Held shut only when it opened itself. Somebody who tapped the
               button is looking something up and must be able to leave. */
            mustRead={intro.due}
            onRead={onRead}
          />
        </>
      ) : null}
    </div>
  );
}
