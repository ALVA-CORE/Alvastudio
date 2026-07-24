import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContributorDesktopGate } from "@/components/layout/ContributorDesktopGate";
import { HomeHeader } from "@/components/contributors/dashboard/HomeHeader";
import { PointsBalanceCard } from "@/components/contributors/dashboard/PointsBalanceCard";
import { DashboardCharts } from "@/components/contributors/dashboard/DashboardCharts";
import { QualityProgressBar } from "@/components/contributors/dashboard/QualityProgressBar";

/** Mock until backend — replace with API data */
const MOCK_POINTS = 1420;

export default function ContributorDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);

  if (isStaff && !isMobile) {
    return <Navigate to="/intern/dashboard" replace />;
  }

  if (!isStaff && !isMobile) {
    return <ContributorDesktopGate />;
  }

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="pb-6 pt-5">
      <HomeHeader firstName={firstName} className="px-4" />

      <PointsBalanceCard
        points={MOCK_POINTS}
        currentUserId="1"
        className="mt-5"
      />

      <DashboardCharts className="px-4" />

      <QualityProgressBar />
    </div>
  );
}
