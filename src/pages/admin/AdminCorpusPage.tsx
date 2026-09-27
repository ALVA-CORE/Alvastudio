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
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { VarietyRings } from "@/components/admin/shared/VarietyRings";
import { SharePie } from "@/components/admin/shared/SharePie";
import { CoverageMap } from "@/components/admin/shared/CoverageMap";
import { CorpusFunnel } from "@/components/admin/shared/CorpusFunnel";
import { DemographicHoursChart } from "@/components/interns/dashboard/DemographicHoursChart";
import { CorpusGrowthChart } from "@/components/admin/overview/CorpusGrowthChart";
import { CorpusFlowChart } from "@/components/admin/overview/CorpusFlowChart";
import {
  CORPUS,
  CORPUS_FLOW,
  EMPTY_CORPUS,
  EMPTY_CORPUS_FLOW,
  growthToCsv,
  underCoveredStates,
  CORPUS_DEMOGRAPHICS,
  EMPTY_CORPUS_DEMOGRAPHICS,
} from "@/data/admin/corpus";
import { formatHours } from "@/data/admin/shared";
import type { DashboardTimeRange } from "@/data/internDashboard";
import { downloadCsv } from "@/lib/download-csv";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

/**
 * The corpus, sliced every way the project is judged on.
 *
 * Deliberately all proportions and one growth curve — no per-person detail,
 * which lives on the review and annotation pages. The question here is whether
 * the dataset is balanced, not who made it.
 */
export default function AdminCorpusPage() {
  const isLoading = useSimulatedLoading();
  const { forceEmpty } = useDevUiState();
  const [range, setRange] = useState<DashboardTimeRange>("12m");
  const corpus = forceEmpty ? EMPTY_CORPUS : CORPUS;

  const gaps = underCoveredStates(corpus);
  const approvalRate =
    corpus.totalHours > 0
      ? Math.round((corpus.approvedHours / corpus.totalHours) * 100)
      : 0;

  return (
    <DesktopPageShell className="py-4">
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

      {isLoading ? (
        <AdminPageSkeleton charts={6} chartColumns={3} table={false} />
      ) : (
        <>

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
        className="mt-2 min-h-[13rem]"
        emptyMessage={
          forceEmpty
            ? { title: "No audio yet", description: "Nothing has been collected." }
            : undefined
        }
      >
        <CorpusGrowthChart data={corpus.growth} window={range} />
      </AlvaChartCard>

      <AlvaChartCard
        title="Where the hours go"
        subtitle="Collection type → review stage → outcome"
        className="mt-2 min-h-[14rem]"
        emptyMessage={
          forceEmpty
            ? { title: "Nothing collected", description: "No flow to trace yet." }
            : undefined
        }
      >
        <CorpusFlowChart data={forceEmpty ? EMPTY_CORPUS_FLOW : CORPUS_FLOW} />
      </AlvaChartCard>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AlvaChartCard
          title="By variety"
          subtitle="Which language was spoken"
          className="min-h-[15rem]"
        >
          {/* Two slices of one whole — a donut reads that faster than two
              separate tracks, because the parts sit against each other. */}
          <SharePie slices={corpus.byVariety} centerLabel="total" />
        </AlvaChartCard>
        <AlvaChartCard
          title="By collection type"
          subtitle="How the audio was captured"
          className="min-h-[15rem]"
        >
          <VarietyRings slices={corpus.byType} centerLabel="total" />
        </AlvaChartCard>
        <AlvaChartCard
          title="Review funnel"
          subtitle="Hours narrowing from submitted to approved"
          className="min-h-[15rem]"
        >
          <CorpusFunnel slices={corpus.byStatus} />
        </AlvaChartCard>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <AlvaChartCard
          title="Coverage"
          subtitle="Hours collected by state — hover for the figure"
          className="min-h-[24rem]"
        >
          <CoverageMap slices={corpus.byState} />
        </AlvaChartCard>

        {/* Age and gender are a cross-tab, so they are one pyramid rather
            than two lists — the skew is the whole point. */}
        <AlvaChartCard
          title="Speaker demographics"
          subtitle="Hours by age bracket and gender"
          className="min-h-[19rem]"
        >
          <DemographicHoursChart
            data={forceEmpty ? EMPTY_CORPUS_DEMOGRAPHICS : CORPUS_DEMOGRAPHICS}
          />
        </AlvaChartCard>
      </div>
        </>
      )}
    </DesktopPageShell>
  );
}
