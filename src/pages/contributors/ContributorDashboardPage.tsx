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

/** Mock until backend — replace with API data */
const MOCK_POINTS = 1420;

export default function ContributorDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();

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

      {isLoading ? (
        <ContributorDashboardSkeleton />
      ) : (
        <>
          <PointsBalanceCard
            points={forceEmpty ? 0 : MOCK_POINTS}
            currentUserId="1"
            className="mt-5"
            isEmpty={forceEmpty}
          />

          <DashboardCharts className="px-4" isEmpty={forceEmpty} />

          <QualityProgressBar isEmpty={forceEmpty} />
        </>
      )}
    </div>
  );
}
