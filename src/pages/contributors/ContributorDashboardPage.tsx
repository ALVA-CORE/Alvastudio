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
import { useApiResource } from "@/hooks/useApiResource";
import { contributorDashboard, leaderboard } from "@/lib/api/dashboard";
import {
  toPodium,
  toRecordingMix,
  toWeeklySessions,
} from "@/data/contributors/dashboard";

export default function ContributorDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);
  /* Live counts. */
  const { data: live, isLoading: loadingLive } = useApiResource(
    contributorDashboard,
    []
  );

  /* The top three, for the podium. Separate from the dashboard because it is
   * everybody's standings rather than this contributor's own figures. */
  const { data: top } = useApiResource(leaderboard, []);

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
        <HomeHeader
          firstName={firstName}
          fullName={user?.fullName}
          avatarSeed={user?.email ?? firstName}
        />
      </FixedBlurHeader>

      {loadingLive ? (
        <ContributorDashboardSkeleton />
      ) : (
        <>
          <PointsBalanceCard
            points={live?.points ?? 0}
            currentUserId={live?.contributor_id ?? "1"}
            rank={live?.rank ?? null}
            rankedOf={live?.ranked_contributors ?? 0}
            podium={toPodium(top ?? [])}
            className="mt-1"
          />

          <DashboardCharts
            className="px-4"
            mix={
              live
                ? toRecordingMix(live.prompts_read, live.total_recordings)
                : undefined
            }
            weekly={live ? toWeeklySessions(live.daily_activity) : undefined}
            pay={live?.pay ?? undefined}
          />

          <QualityProgressBar
            isEmpty={(live?.status_breakdown.total ?? 0) === 0}
            breakdown={live?.status_breakdown}
            approved={live?.status_breakdown.approved}
            total={live?.status_breakdown.total}
            medianReviewSeconds={live?.median_review_seconds_in_window}
          />
        </>
      )}
    </div>
  );
}
