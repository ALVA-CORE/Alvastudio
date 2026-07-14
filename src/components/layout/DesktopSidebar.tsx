import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomeSmile from "@solar-icons/react/ui/HomeSmile";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import { cn } from "@/lib/utils";
import { SiriBlob } from "@/components/studio/SiriBlob";

type NavId = "home" | "record" | "review";

const NAV_ITEMS: Array<{
  id: NavId;
  path: string;
  label: string;
}> = [
  { id: "home", path: "/intern/dashboard", label: "Home" },
  { id: "record", path: "/studio", label: "Record" },
  { id: "review", path: "/review", label: "Review" },
];

function getActiveNav(pathname: string): NavId {
  if (pathname.startsWith("/studio")) return "record";
  if (pathname.startsWith("/review")) return "review";
  return "home";
}

export function DesktopSidebar() {
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
          aria-label="Desktop navigation"
          className={cn(
            "flex flex-col gap-2 px-3",
            hovered ? "items-stretch" : "items-center"
          )}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            const isRecord = item.id === "record";

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
                  isRecord && !hovered && "p-1"
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
                {item.id === "record" && (
                  <SiriBlob size="nav" className="shrink-0" />
                )}
                {item.id === "review" && (
                  <Clipboard
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
