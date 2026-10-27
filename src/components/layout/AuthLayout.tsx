import { Outlet, useLocation } from "react-router-dom";
import { AlvaLogo } from "@/components/auth/AlvaLogo";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { cn } from "@/lib/utils";

/**
 * `dvh`, not `vh`.
 *
 * On a phone `100vh` is the *large* viewport — the height the page would have
 * if the browser's address bar were hidden — so a `min-h-screen` page is
 * always taller than what you can see, and short pages like sign-in scroll by
 * sixty-odd pixels for no reason. `dvh` tracks the viewport as the bar slides
 * away, so a page that fits stays still.
 */
export function AuthLayout() {
  const { pathname } = useLocation();
  const isContributorSignup = pathname.startsWith("/contributor/signup");

  return (
    <div className="relative min-h-dvh bg-alva-bg">
      <AlvaTopGlow />

      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full flex-col px-5 py-6 sm:px-6 sm:py-8",
          isContributorSignup ? "max-w-lg" : "max-w-md"
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col",
            /* No bottom padding on a centred page: it shifts the form off
               centre by half of itself, which on a short screen is the
               difference between fitting and not. */
            isContributorSignup ? "justify-start pb-8 pt-4" : "justify-center"
          )}
        >
          <div className="mb-6 flex justify-center sm:mb-8">
            <AlvaLogo className="h-12 sm:h-14" />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
