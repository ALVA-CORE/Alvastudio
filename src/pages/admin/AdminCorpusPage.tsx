import ClockCircle from "@solar-icons/react/time/ClockCircle";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import Upload from "@solar-icons/react/arrows-action/Upload";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { TextureButton } from "@/components/ui/texture-button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { VarietyRings } from "@/components/admin/shared/VarietyRings";
import { SharePie } from "@/components/admin/shared/SharePie";
import { CoverageMap } from "@/components/admin/shared/CoverageMap";
import { CorpusGrowthChart } from "@/components/admin/overview/CorpusGrowthChart";
import { CorpusFlowChart } from "@/components/admin/overview/CorpusFlowChart";
import { DemographicHoursChart } from "@/components/interns/dashboard/DemographicHoursChart";
import { CorpusFunnel } from "@/components/admin/shared/CorpusFunnel";
import {
  EMPTY_CORPUS,
  EMPTY_CORPUS_DEMOGRAPHICS,
  EMPTY_CORPUS_FLOW,
  underCoveredStates,
} from "@/data/admin/corpus";
import { formatHours } from "@/data/admin/shared";
import { downloadCsv } from "@/lib/download-csv";
import { useCorpus } from "@/hooks/useCorpus";
import { useDevUiState } from "@/hooks/use-dev-ui-state";

/**
 * The corpus, sliced every way the project is judged on.
 *
 * Deliberately all proportions and one growth curve — no per-person detail,
 * which lives on the review and annotation pages. The question here is whether
 * the dataset is balanced, not who made it.
 */
export default function AdminCorpusPage() {
  const { data, coverage, raw, isLoading, error, reload } = useCorpus();
  const { forceEmpty } = useDevUiState();
  const corpus = forceEmpty || !data ? EMPTY_CORPUS : data;

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
            {/* Coverage, not growth. The API has no hours-over-time series,
                and this is the table an admin actually takes away. */}
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={() =>
                downloadCsv(
                  "corpus-coverage.csv",
                  [
                    "state,speakers,hours",
                    ...(coverage?.states ?? []).map(
                      (row) => `${row.state},${row.speakers},${row.hours}`
                    ),
                  ].join("\n")
                )
              }
            >
              <Upload size={15} weight="Outline" />
              Export
            </TextureButton>
          </div>
        }
      />

      {error ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton charts={4} chartColumns={3} table={false} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Total hours"
          value={formatHours(corpus.totalHours)}
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
          icon={CheckCircle}
        />
        <MetricCard
          title="Contributors"
          value={String(corpus.contributors)}
          /* Hours are measured server side by decoding each upload. These are
             the rows still falling back to what the browser claimed, which is
             worth knowing whenever the total goes in front of anyone. */
          trend={
            raw && raw.unmeasured_rows > 0
              ? {
                  label: `${raw.unmeasured_rows} rows unmeasured`,
                  positive: false,
                  neutral: true,
                }
              : undefined
          }
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
          icon={MapPointWave}
        />
      </div>

      {/* Both of these are drawn empty rather than removed, and empty rather
          than seeded. `/corpus/summary` is a snapshot with no time axis, and
          it gives the marginals by type and by status but not the join
          between them — a sankey drawn from marginals invents its own links.
          Leaving the frames up keeps the gap visible; filling them with
          invented numbers would hide it. See docs/endpoints-needed.md §5. */}
      <AlvaChartCard
        title="Corpus growth"
        subtitle="Cumulative hours collected"
        className="mt-2 h-[25rem]"
        emptyMessage={{ title: "Waiting on the API", description: "No hours-over-time series yet. See docs/endpoints-needed.md." }}
      >
        <CorpusGrowthChart data={[]} />
      </AlvaChartCard>

      <AlvaChartCard
        title="Where the hours go"
        subtitle="Collection type → review stage → outcome"
        className="mt-2 min-h-[14rem]"
        emptyMessage={{ title: "Waiting on the API", description: "Type and status come back as separate totals, not the split between them." }}
      >
        <CorpusFlowChart data={EMPTY_CORPUS_FLOW} />
      </AlvaChartCard>

      <div className="mt-2 grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <AlvaChartCard
          title="By variety"
          subtitle="Which language was spoken"
          className="min-h-[15rem]"
        
          emptyMessage={
            corpus.byVariety.length === 0 ? { title: "Nothing to show", description: "The API returns no hours in this split yet." } : undefined
          }
        >
          {/* Two slices of one whole — a donut reads that faster than two
              separate tracks, because the parts sit against each other. */}
          <SharePie slices={corpus.byVariety} centerLabel="total" />
        </AlvaChartCard>
        <AlvaChartCard
          title="By collection type"
          subtitle="How the audio was captured"
          className="min-h-[15rem]"
        
          emptyMessage={
            corpus.byType.length === 0 ? { title: "Nothing to show", description: "The API returns no hours in this split yet." } : undefined
          }
        >
          <VarietyRings slices={corpus.byType} centerLabel="total" />
        </AlvaChartCard>
        <AlvaChartCard
          title="Review funnel"
          subtitle="Hours narrowing from submitted to approved"
          className="min-h-[15rem]"
        
          emptyMessage={
            corpus.byStatus.length === 0 ? { title: "Nothing to show", description: "The API returns no hours in this split yet." } : undefined
          }
        >
          <CorpusFunnel slices={corpus.byStatus} />
        </AlvaChartCard>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <AlvaChartCard
          title="Coverage"
          subtitle="Hours collected by state, hover for the figure"
          className="min-h-[24rem]"
        >
          <CoverageMap slices={corpus.byState} />
        </AlvaChartCard>

        {/* Corpus-wide demographics have no endpoint. `/dashboard/intern`
            carries a by-gender and by-age split, but that is one intern's own
            sessions rather than the dataset, and the question here is whether
            the dataset is balanced. */}
        <AlvaChartCard
          title="Speaker demographics"
          subtitle="Hours by age bracket and gender"
          className="min-h-[19rem]"
          emptyMessage={{ title: "Waiting on the API", description: "No corpus-wide gender or age split yet." }}
        >
          <DemographicHoursChart data={EMPTY_CORPUS_DEMOGRAPHICS} />
        </AlvaChartCard>

        <AlvaChartCard
          title="Unmatched states"
          subtitle="Free-text entries that matched no state"
          className="min-h-[19rem]"
          emptyMessage={
            Object.keys(coverage?.unmatched_states ?? {}).length === 0
              ? {
                  title: "Everything matched",
                  description: "Every state entered maps to a real one.",
                }
              : undefined
          }
        >
          {/* Typos land in `unknown` and would otherwise disappear. Shown so
              they can be corrected at source. */}
          <dl className="alva-thin-scrollbar max-h-[15rem] space-y-1 overflow-y-auto pr-1">
            {Object.entries(coverage?.unmatched_states ?? {})
              .sort((a, b) => b[1] - a[1])
              .map(([value, count]) => (
                <div
                  key={value}
                  className="flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
                >
                  <dt className="min-w-0 truncate text-xs text-foreground">
                    {value || "(blank)"}
                  </dt>
                  <dd className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {count}
                  </dd>
                </div>
              ))}
          </dl>
        </AlvaChartCard>
      </div>
        </>
      )}
    </DesktopPageShell>
  );
}
