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
import { DevUiStateToggle } from "@/components/shared/DevUiStateToggle";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";
import GraphUp from "@solar-icons/react/business/GraphUp";

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
        <>
          <Skeleton className="mx-4 mt-5 h-36 rounded-2xl bg-alva-surface" />
          <div className="mt-5 space-y-3 px-4">
            <Skeleton className="h-44 rounded-2xl bg-alva-surface" />
            <Skeleton className="h-44 rounded-2xl bg-alva-surface" />
          </div>
        </>
      ) : forceEmpty ? (
        <>
          <div className="mt-5 px-4">
            <AlvaEmptyState
              icon={<GraphUp size={20} weight="Outline" />}
              title="No activity yet"
              description="Record your first prompt to start earning points and tracking quality."
            />
          </div>
          <QualityProgressBar isEmpty />
        </>
      ) : (
        <>
          <PointsBalanceCard
            points={MOCK_POINTS}
            currentUserId="1"
            className="mt-5"
          />

          <DashboardCharts className="px-4" />

          <QualityProgressBar />
        </>
      )}

      <DevUiStateToggle />
    </div>
  );
}
