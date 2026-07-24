import { Outlet, useLocation } from "react-router-dom";
import { AlvaLogo } from "@/components/auth/AlvaLogo";
import { cn } from "@/lib/utils";

export function AuthLayout() {
  const { pathname } = useLocation();
  const isContributorSignup = pathname.startsWith("/contributor/signup");

  return (
    <div className="relative min-h-screen bg-alva-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] min-h-[320px] bg-[linear-gradient(to_bottom,hsl(var(--alva-accent)/0.42)_0%,hsl(var(--alva-accent)/0.24)_18%,hsl(var(--alva-accent)/0.12)_36%,hsl(var(--alva-accent)/0.05)_58%,hsl(var(--alva-accent)/0.015)_78%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[58vh] min-h-[360px] bg-[radial-gradient(ellipse_90%_70%_at_50%_-8%,hsl(var(--alva-accent)/0.34),transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[48vh] min-h-[300px] bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,hsl(var(--alva-accent)/0.18),transparent_68%)]"
      />

      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full flex-col px-5 py-8 sm:px-6",
          isContributorSignup ? "max-w-lg" : "max-w-md"
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col pb-8",
            isContributorSignup ? "justify-start pt-4" : "justify-center"
          )}
        >
          <div className="mb-8 flex justify-center">
            <AlvaLogo className="h-14" />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
