import { Navigate, Route, Routes } from "react-router-dom";
import { AppShellLayout, AuthLayout } from "@/components/layout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import LoginPage from "@/pages/auth/LoginPage";
import ContributorSignupPage from "@/pages/auth/ContributorSignupPage";
import SignupPage from "@/pages/auth/SignupPage";
import AnnotatorSignupPage from "@/pages/auth/AnnotatorSignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import ContributorDashboardPage from "@/pages/contributors/ContributorDashboardPage";
import ContributorStudioPage from "@/pages/contributors/ContributorStudioPage";
import ContributorProfilePage from "@/pages/contributors/ContributorProfilePage";
import ContributorNotificationsPage from "@/pages/contributors/ContributorNotificationsPage";
import InternDashboard from "@/pages/interns/InternDashboard";
import InternReviewPage from "@/pages/interns/InternReviewPage";
import InternReviewDetailPage from "@/pages/interns/InternReviewDetailPage";
import InternRecordPage from "@/pages/interns/InternRecordPage";
import InternParticipantsPage from "@/pages/interns/InternParticipantsPage";
import InternProfilePage from "@/pages/interns/InternProfilePage";
import AnnotatorDashboardPage from "@/pages/annotators/AnnotatorDashboardPage";
import AnnotatorSessionsPage from "@/pages/annotators/AnnotatorSessionsPage";
import AnnotatorWorkspacePage from "@/pages/annotators/AnnotatorWorkspacePage";
import AnnotatorProfilePage from "@/pages/annotators/AnnotatorProfilePage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminPromptsPage from "@/pages/admin/AdminPromptsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCorpusPage from "@/pages/admin/AdminCorpusPage";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";
import AdminAnnotationsPage from "@/pages/admin/AdminAnnotationsPage";
import AdminFocusGroupsPage from "@/pages/admin/AdminFocusGroupsPage";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminAudioPage from "@/pages/admin/AdminAudioPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import NotFoundPage from "@/pages/errors/NotFoundPage";
import { ProtectedRoute, GuestRoute, RoleRoute, AdminAreaRoute } from "@/routes/guards";
import { useAuth } from "@/lib/auth/context";
import { homePathForRole } from "@/lib/auth/roles";

/**
 * Everybody lands on their own home, on every screen size.
 *
 * An intern on a phone used to be sent to the contributor dashboard, on the
 * grounds that the intern one was built for a laptop. That showed somebody
 * another role's screen, with another role's figures and another role's
 * navigation, and it is the sort of thing that should be impossible rather
 * than merely unusual — an intern has no contributor record to read.
 *
 * The intern dashboard stacks to one column on a narrow screen, so there was
 * nothing to fall back from. Annotators and admins meet a gate on mobile
 * instead, which says why rather than dropping them somewhere they cannot
 * act.
 */
function useHomePath() {
  const { user } = useAuth();
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
    <>
      <DocumentTitle />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/contributor/signup" element={<ContributorSignupPage />} />
            <Route path="/intern/signup" element={<SignupPage />} />
            <Route path="/annotator/signup" element={<AnnotatorSignupPage />} />
            <Route path="/signup" element={<Navigate to="/intern/signup" replace />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        {/* Outside `GuestRoute`, deliberately.
            A reset link is opened by whoever clicks it, and that is often
            somebody with a live session in another tab — an admin testing
            it, or a person who is signed in on this device and locked out
            of another. Behind the guest guard they would be bounced to
            their dashboard and the link would silently do nothing, which
            is the one outcome a recovery flow cannot afford. */}
        <Route element={<AuthLayout />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShellLayout />}>
            <Route path="/contributor/dashboard" element={<ContributorDashboardPage />} />
            <Route path="/contributor/studio" element={<ContributorStudioPage />} />
            <Route path="/contributor/notifications" element={<ContributorNotificationsPage />} />
            <Route path="/contributor/profile" element={<ContributorProfilePage />} />

            <Route element={<RoleRoute roles={["intern", "admin"]} />}>
              <Route path="/intern/dashboard" element={<InternDashboard />} />
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

            {/*
              Admin is its own surface, not a superset of the intern one. Admins
              can still reach the intern and annotator routes above — those guards
              include "admin" — but they land here.
            */}
            <Route element={<RoleRoute roles={["admin"]} />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route element={<AdminAreaRoute area="prompts" />}>
              <Route path="/admin/prompts" element={<AdminPromptsPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="users" />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="corpus" />}>
              <Route path="/admin/corpus" element={<AdminCorpusPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="reviews" />}>
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="annotations" />}>
              <Route path="/admin/annotations" element={<AdminAnnotationsPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="focus-groups" />}>
              <Route path="/admin/focus-groups" element={<AdminFocusGroupsPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="payments" />}>
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            </Route>
              <Route element={<AdminAreaRoute area="audio" />}>
              <Route path="/admin/audio" element={<AdminAudioPage />} />
            </Route>
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
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
    </>
  );
}
