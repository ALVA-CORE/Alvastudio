import { useAuth } from "@/lib/auth/context";
import { useIsMobile } from "@/hooks/use-mobile";
import { HomeHeader } from "@/components/dashboard/HomeHeader";
import { PointsBalanceCard } from "@/components/dashboard/PointsBalanceCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { QualityProgressBar } from "@/components/dashboard/QualityProgressBar";
import InternDashboard from "@/pages/dashboard/InternDashboard";

/** Mock until backend — replace with API data */
const MOCK_POINTS = 1420;

function ContributorDashboard() {
  const { user } = useAuth();
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

export default function DashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = user?.role === "intern" || user?.role === "admin";

  if (isStaff && !isMobile) {
    return <InternDashboard />;
  }

  return <ContributorDashboard />;
}
