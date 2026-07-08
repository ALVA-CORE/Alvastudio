import { Navigate, Route, Routes } from "react-router-dom";
import { AppShellLayout, AuthLayout } from "@/components/layout";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import StudioPage from "@/pages/studio/StudioPage";
import ReviewPage from "@/pages/review/ReviewPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import NotFoundPage from "@/pages/errors/NotFoundPage";
import { ProtectedRoute, GuestRoute, RoleRoute } from "@/routes/guards";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShellLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<RoleRoute roles={["intern", "admin"]} />}>
            <Route path="/review" element={<ReviewPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
