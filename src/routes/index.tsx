import { Navigate, Route, Routes } from "react-router-dom";
import { AppShellLayout, AuthLayout } from "@/components/layout";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ContributorDashboardPage from "@/pages/contributors/ContributorDashboardPage";
import ContributorStudioPage from "@/pages/contributors/ContributorStudioPage";
import ContributorProfilePage from "@/pages/contributors/ContributorProfilePage";
import InternDashboardPage from "@/pages/interns/InternDashboardPage";
import InternReviewPage from "@/pages/interns/InternReviewPage";
import InternReviewDetailPage from "@/pages/interns/InternReviewDetailPage";
import InternRecordPage from "@/pages/interns/InternRecordPage";
import InternParticipantsPage from "@/pages/interns/InternParticipantsPage";
import InternProfilePage from "@/pages/interns/InternProfilePage";
import AnnotatorDashboardPage from "@/pages/annotators/AnnotatorDashboardPage";
import AnnotatorReviewPage from "@/pages/annotators/AnnotatorReviewPage";
import NotFoundPage from "@/pages/errors/NotFoundPage";
import { ProtectedRoute, GuestRoute, RoleRoute } from "@/routes/guards";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";
import { useIsMobile } from "@/hooks/use-mobile";

function RootRedirect() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (user && isStaffRole(user.role) && !isMobile) {
    return <Navigate to="/intern/dashboard" replace />;
  }

  return <Navigate to="/contributor/dashboard" replace />;
}

function LegacyDashboardRedirect() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (user && isStaffRole(user.role) && !isMobile) {
    return <Navigate to="/intern/dashboard" replace />;
  }

  return <Navigate to="/contributor/dashboard" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShellLayout />}>
          <Route path="/contributor/dashboard" element={<ContributorDashboardPage />} />
          <Route path="/contributor/studio" element={<ContributorStudioPage />} />
          <Route path="/contributor/profile" element={<ContributorProfilePage />} />

          <Route element={<RoleRoute roles={["intern", "admin"]} />}>
            <Route path="/intern/dashboard" element={<InternDashboardPage />} />
            <Route path="/intern/record" element={<InternRecordPage />} />
            <Route path="/intern/participants" element={<InternParticipantsPage />} />
            <Route path="/intern/review" element={<InternReviewPage />} />
            <Route path="/intern/review/:id" element={<InternReviewDetailPage />} />
            <Route path="/intern/profile" element={<InternProfilePage />} />
          </Route>

          <Route path="/annotator/dashboard" element={<AnnotatorDashboardPage />} />
          <Route path="/annotator/review" element={<AnnotatorReviewPage />} />

          <Route path="/dashboard" element={<LegacyDashboardRedirect />} />
          <Route path="/studio" element={<Navigate to="/contributor/studio" replace />} />
          <Route path="/profile" element={<Navigate to="/contributor/profile" replace />} />
          <Route path="/review" element={<Navigate to="/intern/review" replace />} />
          <Route path="/review/:id" element={<Navigate to="/intern/review" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
