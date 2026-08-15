import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomeSmile from "@solar-icons/react/ui/HomeSmile";
import Settings from "@solar-icons/react/settings/Settings";
import { cn } from "@/lib/utils";
import { SiriBlob } from "@/components/contributors/studio/SiriBlob";

type NavId = "home" | "sessions" | "profile";

const NAV_ITEMS: Array<{ id: NavId; path: string; label: string }> = [
  { id: "home", path: "/annotator/dashboard", label: "Home" },
  { id: "sessions", path: "/annotator/sessions", label: "Sessions" },
  { id: "profile", path: "/annotator/profile", label: "Settings" },
];

function getActiveNav(pathname: string): NavId {
  if (pathname.startsWith("/annotator/sessions")) return "sessions";
  if (pathname.startsWith("/annotator/profile")) return "profile";
  return "home";
}

/**
 * Desktop rail for the annotator surface. Same hover-to-expand behaviour as
 * the intern sidebar, but the middle item is the session queue — so it gets
 * the SiriBlob treatment the intern rail gives Record.
 */
export function AnnotatorSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = getActiveNav(location.pathname);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed left-0 top-0 z-50 hidden h-screen md:block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "pointer-events-auto absolute left-0 top-0 flex h-full flex-col justify-center py-6 backdrop-blur-xl transition-[width] duration-300 ease-out",
          hovered ? "w-48" : "w-[4.5rem]"
        )}
      >
        <nav
          aria-label="Annotator navigation"
          className={cn(
            "flex flex-col gap-2 px-3",
            hovered ? "items-stretch" : "items-center"
          )}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            const isSessions = item.id === "sessions";

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center rounded-full",
                  hovered ? "gap-3 px-3 py-2" : "justify-center p-2",
                  isSessions && !hovered && "p-1"
                )}
              >
                {item.id === "home" && (
                  <HomeSmile
                    size={22}
                    weight={isActive ? "BoldDuotone" : "Outline"}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-alva-accent" : "text-muted-foreground"
                    )}
                  />
                )}
                {isSessions && <SiriBlob size="nav" className="shrink-0" />}
                {item.id === "profile" && (
                  <Settings
                    size={22}
                    weight={isActive ? "BoldDuotone" : "Outline"}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-alva-accent" : "text-muted-foreground"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ease-out",
                    isActive ? "text-alva-accent" : "text-muted-foreground",
                    hovered ? "max-w-[7rem] opacity-100" : "max-w-0 opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
