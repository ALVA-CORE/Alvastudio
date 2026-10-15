import { AlvaToaster } from "@/components/shared";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppThemeProvider } from "@/components/layout";
import { AuthProvider } from "@/lib/auth/context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppThemeProvider>
        <TooltipProvider>
          <AlvaToaster />
          <BrowserRouter
      /* Opt in now rather than being surprised by v7. Both are behaviour we
         already rely on: transitions around navigation, and splat routes
         resolving relative to the route rather than the match. */
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AppThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
