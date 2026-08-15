import { Navigate, Route, Routes } from "react-router-dom";
import { AppShellLayout, AuthLayout } from "@/components/layout";
import LoginPage from "@/pages/auth/LoginPage";
import ContributorSignupPage from "@/pages/auth/ContributorSignupPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ContributorDashboardPage from "@/pages/contributors/ContributorDashboardPage";
import ContributorStudioPage from "@/pages/contributors/ContributorStudioPage";
import ContributorProfilePage from "@/pages/contributors/ContributorProfilePage";
import ContributorNotificationsPage from "@/pages/contributors/ContributorNotificationsPage";
import InternDashboardPage from "@/pages/interns/InternDashboardPage";
import InternReviewPage from "@/pages/interns/InternReviewPage";
import InternReviewDetailPage from "@/pages/interns/InternReviewDetailPage";
import InternRecordPage from "@/pages/interns/InternRecordPage";
import InternParticipantsPage from "@/pages/interns/InternParticipantsPage";
import InternProfilePage from "@/pages/interns/InternProfilePage";
import AnnotatorDashboardPage from "@/pages/annotators/AnnotatorDashboardPage";
import AnnotatorSessionsPage from "@/pages/annotators/AnnotatorSessionsPage";
import AnnotatorWorkspacePage from "@/pages/annotators/AnnotatorWorkspacePage";
import AnnotatorProfilePage from "@/pages/annotators/AnnotatorProfilePage";
import NotFoundPage from "@/pages/errors/NotFoundPage";
import { ProtectedRoute, GuestRoute, RoleRoute } from "@/routes/guards";
import { useAuth } from "@/lib/auth/context";
import { homePathForRole, isInternRole } from "@/lib/auth/roles";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Interns get a real mobile surface (they record in the field), so on a phone
 * they fall back to the contributor dashboard. Annotators do not — annotation
 * is desktop work — so they keep their own home and meet the mobile gate,
 * which explains why rather than dropping them somewhere they can't act.
 */
function useHomePath() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (user && isMobile && isInternRole(user.role)) {
    return "/contributor/dashboard";
  }

  return homePathForRole(user?.role);
}

function RootRedirect() {
  return <Navigate to={useHomePath()} replace />;
}

function LegacyDashboardRedirect() {
  return <Navigate to={useHomePath()} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/contributor/signup" element={<ContributorSignupPage />} />
          <Route path="/intern/signup" element={<SignupPage />} />
          <Route path="/signup" element={<Navigate to="/intern/signup" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShellLayout />}>
          <Route path="/contributor/dashboard" element={<ContributorDashboardPage />} />
          <Route path="/contributor/studio" element={<ContributorStudioPage />} />
          <Route path="/contributor/notifications" element={<ContributorNotificationsPage />} />
          <Route path="/contributor/profile" element={<ContributorProfilePage />} />

          <Route element={<RoleRoute roles={["intern", "admin"]} />}>
            <Route path="/intern/dashboard" element={<InternDashboardPage />} />
            <Route path="/intern/record" element={<InternRecordPage />} />
            <Route path="/intern/participants" element={<InternParticipantsPage />} />
            <Route path="/intern/review" element={<InternReviewPage />} />
            <Route path="/intern/review/:id" element={<InternReviewDetailPage />} />
            <Route path="/intern/profile" element={<InternProfilePage />} />
          </Route>

          <Route element={<RoleRoute roles={["annotator", "admin"]} />}>
            <Route path="/annotator/dashboard" element={<AnnotatorDashboardPage />} />
            <Route path="/annotator/sessions" element={<AnnotatorSessionsPage />} />
            <Route path="/annotator/profile" element={<AnnotatorProfilePage />} />
            {/* Legacy review paths now resolve to the session queue. */}
            <Route
              path="/annotator/review"
              element={<Navigate to="/annotator/sessions" replace />}
            />
            <Route
              path="/annotator/review/:id"
              element={<Navigate to="/annotator/sessions" replace />}
            />
          </Route>

          <Route path="/dashboard" element={<LegacyDashboardRedirect />} />
          <Route path="/studio" element={<Navigate to="/contributor/studio" replace />} />
          <Route path="/profile" element={<Navigate to="/contributor/profile" replace />} />
          <Route path="/review" element={<Navigate to="/intern/review" replace />} />
          <Route path="/review/:id" element={<Navigate to="/intern/review" replace />} />
        </Route>

        {/*
          The workspace sits OUTSIDE AppShellLayout: it is a full-bleed editor
          with its own header and back link, and the timeline wants every pixel
          of horizontal room. Still role-guarded.
        */}
        <Route element={<RoleRoute roles={["annotator", "admin"]} />}>
          <Route
            path="/annotator/sessions/:sessionId"
            element={<AnnotatorWorkspacePage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
