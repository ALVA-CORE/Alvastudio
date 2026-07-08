import { ThemeProvider } from "next-themes";

type AppThemeProviderProps = {
  children: React.ReactNode;
};

/** Dark-mode-only theme provider for next-themes consumers (e.g. Sonner). */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      {children}
    </ThemeProvider>
  );
}
