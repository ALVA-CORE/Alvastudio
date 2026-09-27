import { useState } from "react";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import Download from "@solar-icons/react/arrows-action/Download";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { TextureButton } from "@/components/ui/texture-button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { HoursBreakdownBars } from "@/components/admin/shared/HoursBreakdownBars";
import { CorpusGrowthChart } from "@/components/admin/overview/CorpusGrowthChart";
import { CORPUS, EMPTY_CORPUS, growthToCsv, underCoveredStates } from "@/data/admin/corpus";
import { formatHours } from "@/data/admin/shared";
import type { DashboardTimeRange } from "@/data/internDashboard";
import { downloadCsv } from "@/lib/download-csv";
import { useDevUiState } from "@/hooks/use-dev-ui-state";

/**
 * The corpus, sliced every way the project is judged on.
 *
 * Deliberately all proportions and one growth curve — no per-person detail,
 * which lives on the review and annotation pages. The question here is whether
 * the dataset is balanced, not who made it.
 */
export default function AdminCorpusPage() {
  const { forceEmpty } = useDevUiState();
  const [range, setRange] = useState<DashboardTimeRange>("12m");
  const corpus = forceEmpty ? EMPTY_CORPUS : CORPUS;

  const gaps = underCoveredStates(corpus);
  const approvalRate =
    corpus.totalHours > 0
      ? Math.round((corpus.approvedHours / corpus.totalHours) * 100)
      : 0;

  return (
    <DesktopPageShell className="py-4" fullWidth>
      <AdminPageHeader
        id="corpus"
        actions={
          <div className="flex items-center gap-2">
            <DashboardTimeFilter value={range} onChange={setRange} />
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={() => downloadCsv("corpus-growth.csv", growthToCsv(corpus.growth))}
            >
              <Download size={15} weight="Outline" />
              Export
            </TextureButton>
          </div>
        }
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Total hours"
          value={formatHours(corpus.totalHours)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={ClockCircle}
        />
        <MetricCard
          title="Approved hours"
          value={formatHours(corpus.approvedHours)}
          trend={{
            label: corpus.totalHours ? `${approvalRate}% approved` : "",
            positive: false,
            neutral: true,
          }}
          period=""
          icon={CheckCircle}
        />
        <MetricCard
          title="Contributors"
          value={String(corpus.contributors)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="States covered"
          value={String(corpus.byState.filter((slice) => slice.hours > 0).length)}
          trend={{
            label: gaps.length > 0 ? `${gaps.length} under target` : "",
            positive: false,
            neutral: true,
          }}
          period=""
          icon={MapPointWave}
        />
      </div>

      <AlvaChartCard
        title="Corpus growth"
        subtitle="Cumulative hours collected"
        className="mt-2 min-h-[18rem]"
        emptyMessage={
          forceEmpty
            ? { title: "No audio yet", description: "Nothing has been collected." }
            : undefined
        }
      >
        <CorpusGrowthChart data={corpus.growth} window={range} />
      </AlvaChartCard>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AlvaChartCard title="By variety" subtitle="Which language was spoken">
          <HoursBreakdownBars slices={corpus.byVariety} emphasiseFirst />
        </AlvaChartCard>
        <AlvaChartCard title="By status" subtitle="Where hours sit in review">
          <HoursBreakdownBars slices={corpus.byStatus} />
        </AlvaChartCard>
        <AlvaChartCard title="By collection type" subtitle="How the audio was captured">
          <HoursBreakdownBars slices={corpus.byType} />
        </AlvaChartCard>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AlvaChartCard
          title="By state"
          subtitle="Where speakers are from"
          className="lg:col-span-1"
        >
          <HoursBreakdownBars slices={corpus.byState} emphasiseFirst />
        </AlvaChartCard>
        <AlvaChartCard title="By age bracket" subtitle="Speaker age distribution">
          <HoursBreakdownBars slices={corpus.byAge} />
        </AlvaChartCard>
        <AlvaChartCard title="By gender" subtitle="Speaker gender distribution">
          <HoursBreakdownBars slices={corpus.byGender} />
        </AlvaChartCard>
      </div>
    </DesktopPageShell>
  );
}
