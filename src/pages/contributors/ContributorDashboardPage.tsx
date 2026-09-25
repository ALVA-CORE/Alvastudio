import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContributorDesktopGate } from "@/components/layout/ContributorDesktopGate";
import { HomeHeader } from "@/components/contributors/dashboard/HomeHeader";
import { FixedBlurHeader } from "@/components/shared/FixedBlurHeader";
import { PointsBalanceCard } from "@/components/contributors/dashboard/PointsBalanceCard";
import { DashboardCharts } from "@/components/contributors/dashboard/DashboardCharts";
import { QualityProgressBar } from "@/components/contributors/dashboard/QualityProgressBar";
import { ContributorDashboardSkeleton } from "@/components/contributors/dashboard/ContributorDashboardSkeleton";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";
import { useApiResource } from "@/hooks/useApiResource";
import { contributorDashboard } from "@/lib/api/dashboard";

/**
 * Points have no backend equivalent yet.
 *
 * `/dashboard/contributor` returns recording counts, hours and a status
 * breakdown, and `/payments/earnings` returns money — neither is a points
 * balance. See docs/backend-gaps.md.
 */
const MOCK_POINTS = 1420;

export default function ContributorDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();

  /* Live counts. The charts below still run on seeded data — the endpoint
   * returns totals, not a time series. */
  const { data: live, isLoading: loadingLive } = useApiResource(
    contributorDashboard,
    []
  );

  if (isStaff && !isMobile) {
    return <Navigate to="/intern/dashboard" replace />;
  }

  if (!isStaff && !isMobile) {
    return <ContributorDesktopGate />;
  }

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="pb-6">
      <FixedBlurHeader contentClassName="pb-4">
        <HomeHeader firstName={firstName} />
      </FixedBlurHeader>

      {isLoading || loadingLive ? (
        <ContributorDashboardSkeleton />
      ) : (
        <>
          <PointsBalanceCard
            points={forceEmpty ? 0 : MOCK_POINTS}
            currentUserId={live?.contributor_id ?? "1"}
            className="mt-5"
            isEmpty={forceEmpty}
          />

          <DashboardCharts className="px-4" isEmpty={forceEmpty} />

          <QualityProgressBar
            isEmpty={forceEmpty || (live?.status_breakdown.total ?? 0) === 0}
            breakdown={live?.status_breakdown}
            approved={live?.status_breakdown.approved}
            total={live?.status_breakdown.total}
          />
        </>
      )}
    </div>
  );
}
