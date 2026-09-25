import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, getActiveAdminNav } from "./adminNav";

/**
 * Desktop rail for the admin surface.
 *
 * Same hover-to-expand behaviour as the intern and annotator rails, with two
 * differences: it carries ten items instead of five, so the column scrolls on a
 * short viewport rather than clipping; and there is no SiriBlob hero, because
 * admin has no single primary action the way Record and Sessions do.
 */
export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = getActiveAdminNav(location.pathname);
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
          aria-label="Admin navigation"
          className={cn(
            "alva-thin-scrollbar flex min-h-0 flex-col gap-1 overflow-y-auto px-3",
            hovered ? "items-stretch" : "items-center"
          )}
        >
          {ADMIN_NAV_ITEMS.map(({ id, path, label, Icon }) => {
            const isActive = id === activeId;

            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => navigate(path)}
                className={cn(
                  "flex shrink-0 items-center rounded-full",
                  hovered ? "gap-3 px-3 py-2" : "justify-center p-2"
                )}
              >
                <Icon
                  size={22}
                  weight={isActive ? "BoldDuotone" : "Outline"}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-alva-accent" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ease-out",
                    isActive ? "text-alva-accent" : "text-muted-foreground",
                    hovered ? "max-w-[7rem] opacity-100" : "max-w-0 opacity-0"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
