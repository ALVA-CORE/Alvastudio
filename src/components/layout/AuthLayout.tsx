import { Outlet, useLocation } from "react-router-dom";
import { AlvaLogo } from "@/components/auth/AlvaLogo";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { cn } from "@/lib/utils";

export function AuthLayout() {
  const { pathname } = useLocation();
  const isContributorSignup = pathname.startsWith("/contributor/signup");

  return (
    <div className="relative min-h-screen bg-alva-bg">
      <AlvaTopGlow />

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
