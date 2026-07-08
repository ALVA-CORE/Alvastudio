import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  NavChartSquare as ChartSquare,
  NavHomeSmile as HomeSmile,
  NavMicrophone3 as Microphone3,
  NavShieldCheck as ShieldCheck,
} from "@/components/icons/app-nav";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ComponentType<import("@solar-icons/react").IconProps>;
  internOnly?: boolean;
}> = [
  { to: "/studio", label: "Studio", icon: Microphone3 },
  { to: "/dashboard", label: "Dashboard", icon: ChartSquare },
  { to: "/review", label: "Review", icon: ShieldCheck, internOnly: true },
  { to: "/", label: "Account", icon: HomeSmile },
];

type AppShellProps = {
  isIntern?: boolean;
};

export function AppShell({ isIntern = false }: AppShellProps) {
  const items = navItems.filter((item) => !item.internOnly || isIntern);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-alva-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon size={22} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
