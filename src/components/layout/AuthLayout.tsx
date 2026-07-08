import { Outlet } from "react-router-dom";
import { AlvaLogo } from "@/components/auth/AlvaLogo";

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-alva-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[30vh] min-h-[220px] bg-gradient-to-b from-alva-accent via-alva-accent/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[30vh] min-h-[220px] bg-[radial-gradient(ellipse_at_top,hsl(var(--alva-accent)/0.35),transparent_70%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-10 sm:px-6">
        <div className="flex flex-1 flex-col justify-center pb-8">
          <div className="mb-8 flex justify-center">
            <AlvaLogo className="h-14" />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
