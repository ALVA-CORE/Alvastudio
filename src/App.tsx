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
          {/* The `future` flags are gone with v7: start transitions around
              navigation and splat routes resolving relative to the route are
              both the default now, which is what we were opting into. */}
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AppThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
