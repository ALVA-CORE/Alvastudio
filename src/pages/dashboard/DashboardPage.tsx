import { useAuth } from "@/lib/auth/context";
import { HomeHeader } from "@/components/dashboard/HomeHeader";
import { PointsBalanceCard } from "@/components/dashboard/PointsBalanceCard";
import { LeaderboardPodium } from "@/components/dashboard/LeaderboardPodium";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

/** Mock until backend — replace with API data */
const MOCK_POINTS = 1420;

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="pb-6 pt-5">
      <HomeHeader firstName={firstName} className="px-4" />

      <PointsBalanceCard points={MOCK_POINTS} className="mt-5" />

      <LeaderboardPodium currentUserId="1" />

      <DashboardCharts />
    </div>
  );
}
