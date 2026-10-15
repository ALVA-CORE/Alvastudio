import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { DashboardTimeFilter } from "@/components/shared/DashboardTimeFilter";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { SharePie } from "@/components/admin/shared/SharePie";
import { CorpusFunnel } from "@/components/admin/shared/CorpusFunnel";
import { CorpusGrowthChart } from "@/components/admin/overview/CorpusGrowthChart";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
import { EMPTY_CORPUS } from "@/data/admin/corpus";
import { BANK_ITEMS } from "@/data/admin/prompts";
import { EARNINGS } from "@/data/admin/payments";
import { formatHours } from "@/data/admin/shared";
import type { DashboardTimeRange } from "@/data/internDashboard";
import { useDevUiState } from "@/hooks/use-dev-ui-state";
import { useAdminOverview, cumulative } from "@/hooks/useAdminOverview";
import { useCorpus } from "@/hooks/useCorpus";
import { cn } from "@/lib/utils";

/**
 * The one screen that answers "where is the project".
 *
 * Built around two questions rather than a wall of tiles: how much usable audio
 * exists, and what is currently stuck. The second is the reason this page is
 * worth opening daily — a session with no audio, a prompt nobody records and an
 * unpaid contributor are all invisible everywhere else in the product.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { forceEmpty } = useDevUiState();
  const [range, setRange] = useState<DashboardTimeRange>("12m");

  const overview = useAdminOverview();
  const { data: corpusData, isLoading: loadingCorpus } = useCorpus();

  const isLoading = overview.isLoading || loadingCorpus;
  const corpus = forceEmpty || !corpusData ? EMPTY_CORPUS : corpusData;
  const growth = useMemo(
    () => (forceEmpty ? [] : cumulative(overview.data?.daily_activity ?? [])),
    [forceEmpty, overview.data]
  );

  /**
   * The three backlogs the API counts for us.
   *
   * Each carries an age as well as a count, which is the difference between
   * "three stuck" and "three stuck for a month" — only the second is an
   * emergency. Nothing counts as stuck until it has waited three days.
   */
  const attention = useMemo(() => {
    const stats = overview.data;
    if (forceEmpty || !stats) return [];

    const age = (days: number | null) =>
      days === null ? "" : days === 1 ? " · 1 day waiting" : ` · ${days} days waiting`;

    return [
      {
        id: "unreviewed",
        count: stats.stuck_unreviewed_recordings.count,
        title: "recordings are waiting on a verdict",
        detail: `Nobody has decided on them${age(
          stats.stuck_unreviewed_recordings.oldest_age_days
        )}.`,
        to: "/admin/reviews",
        tone: "bad" as const,
      },
      {
        id: "unclaimed",
        count: stats.stuck_unclaimed_sessions.count,
        title: "focus group sessions are unclaimed",
        detail: `Recorded and uploaded, and no annotator has picked them up${age(
          stats.stuck_unclaimed_sessions.oldest_age_days
        )}.`,
        to: "/admin/annotations",
        tone: "warn" as const,
      },
      {
        id: "rework",
        count: stats.stuck_annotations_in_rework.count,
        title: "annotations are sitting in rework",
        detail: `Sent back and not returned${age(
          stats.stuck_annotations_in_rework.oldest_age_days
        )}.`,
        to: "/admin/annotations",
        tone: "warn" as const,
      },
    ].filter((item) => item.count > 0);
  }, [forceEmpty, overview.data]);

  const approvalRate =
    corpus.totalHours > 0
      ? Math.round((corpus.approvedHours / corpus.totalHours) * 100)
      : 0;

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="overview"
        actions={<DashboardTimeFilter value={range} onChange={setRange} />}
      />

      {overview.error ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {overview.error}
          <button
            type="button"
            onClick={overview.reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton charts={4} chartColumns={2} table={false} />
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
          title="Approved"
          value={formatHours(corpus.approvedHours)}
          trend={{
            label: corpus.totalHours ? `${approvalRate}% of corpus` : "",
            positive: false,
            neutral: true,
          }}
          icon={CheckCircle}
        />
        <MetricCard
          title="Contributors"
          value={String(corpus.contributors)}
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="Focus groups"
          value={String(corpus.sessions)}
          icon={Microphone3}
        />
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-6">
        <AlvaChartCard
          title="Corpus growth"
          /* Clips, not hours. `daily_activity` counts recordings and there is
             no hours-over-time series, so the label says what is plotted. */
          subtitle="Recordings collected, running total"
          className="h-[25rem] lg:col-span-4"
          emptyMessage={
            forceEmpty
              ? {
                  title: "No audio yet",
                  description: "The curve starts once the first clip is approved.",
                }
              : undefined
          }
        >
          <CorpusGrowthChart data={growth} window={range} />
        </AlvaChartCard>

        {/* Not a chart — a worklist. Each row is a link to the page that can
            clear it, because a count you cannot act on is just anxiety. */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-alva-card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Needs attention</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Work that is stuck somewhere nobody is looking
          </p>

          <div className="alva-thin-scrollbar mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {attention.length === 0 ? (
              <p className="my-auto text-center text-xs text-muted-foreground">
                Nothing stuck. Everything recorded has audio, every prompt is
                being used, and no one is owed.
              </p>
            ) : (
              attention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <DangerTriangle
                    size={18}
                    weight="BoldDuotone"
                    className={cn(
                      "mt-0.5 shrink-0",
                      item.tone === "bad" ? "text-red-400" : "text-amber-300"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">
                      <span className="font-semibold tabular-nums">{item.count}</span>{" "}
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                  <AltArrowRight
                    size={16}
                    weight="Outline"
                    className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {/* The sankey stood here. `/corpus/summary` gives hours by type and
          hours by status but not the join between them, and a flow diagram
          drawn from marginals invents its own links. Listed as an ask. */}
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AlvaChartCard
          title="Approval rate"
          subtitle="Share of decided hours kept"
          className="min-h-[14rem]"
        >
          <ApprovalGauge value={approvalRate} label="approved" />
        </AlvaChartCard>
        <AlvaChartCard
          title="By variety"
          subtitle="Hours of each language"
          className="min-h-[14rem]"
        >
          <SharePie slices={corpus.byVariety} centerLabel="total" />
        </AlvaChartCard>
        <AlvaChartCard
          title="Review funnel"
          subtitle="Hours narrowing from submitted to approved"
          className="min-h-[14rem]"
        >
          <CorpusFunnel slices={corpus.byStatus} />
        </AlvaChartCard>
      </div>
        </>
      )}
    </DesktopPageShell>
  );
}
