import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout";
import AuthPage from "@/pages/auth/AuthPage";
import StudioPage from "@/pages/studio/StudioPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ReviewPage from "@/pages/review/ReviewPage";
import NotFoundPage from "@/pages/errors/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route element={<AppShell isIntern />}>
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/review" element={<ReviewPage />} />
      </Route>

      <Route path="/home" element={<Navigate to="/studio" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
