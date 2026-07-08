import { useLocation, useNavigate } from "react-router-dom";
import type { ComponentType } from "react";
import type { IconProps, IconWeight } from "@solar-icons/react/lib/types";
import HomeSmile from "@solar-icons/react/ui/HomeSmile";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import UserRounded from "@solar-icons/react/users/UserRounded";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
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

const navItems: NavItem[] = [
  { id: "home", label: "Home", path: "/dashboard", icon: HomeSmile },
  { id: "record", label: "Record", path: "/studio", icon: Microphone3 },
  { id: "review", label: "Review", path: "/review", icon: ShieldCheck, internOnly: true },
  { id: "profile", label: "Profile", path: "/profile", icon: UserRounded },
];

function getActiveNav(pathname: string): NavId {
  if (pathname.startsWith("/studio")) return "record";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

type FloatingBottomNavProps = {
  isIntern?: boolean;
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

export function FloatingBottomNav({ isIntern = false }: FloatingBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = getActiveNav(location.pathname);
  const items = navItems.filter((item) => !item.internOnly || isIntern);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
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
    </div>
  );
}
