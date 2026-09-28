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
import { CorpusFlowChart } from "@/components/admin/overview/CorpusFlowChart";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
import { CORPUS, CORPUS_FLOW, EMPTY_CORPUS, EMPTY_CORPUS_FLOW } from "@/data/admin/corpus";
import { ADMIN_SESSIONS } from "@/data/admin/oversight";
import { BANK_ITEMS } from "@/data/admin/prompts";
import { EARNINGS } from "@/data/admin/payments";
import { formatHours } from "@/data/admin/shared";
import type { DashboardTimeRange } from "@/data/internDashboard";
import { useDevUiState, useSimulatedLoading } from "@/hooks/use-dev-ui-state";
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
  const isLoading = useSimulatedLoading();
  const navigate = useNavigate();
  const { forceEmpty } = useDevUiState();
  const [range, setRange] = useState<DashboardTimeRange>("12m");

  const corpus = forceEmpty ? EMPTY_CORPUS : CORPUS;

  /* Each of these is a real backlog somewhere else in the product. They are
   * counted here rather than fetched as a "needs attention" feed, because the
   * counts are derivable and a feed would be one more thing to keep in sync. */
  const attention = useMemo(() => {
    if (forceEmpty) return [];

    const noAudio = ADMIN_SESSIONS.filter((session) => !session.hasAudio).length;
    const unusedPrompts = BANK_ITEMS.filter(
      (item) => item.isActive && item.usedByCount === 0
    ).length;
    const unpaid = EARNINGS.filter((row) => row.status !== "paid").length;

    return [
      {
        id: "no-audio",
        count: noAudio,
        title: "focus group sessions have no audio",
        detail: "They never reach the annotation queue, so the work is invisible.",
        to: "/admin/focus-groups",
        tone: "bad" as const,
      },
      {
        id: "unused",
        count: unusedPrompts,
        title: "active prompts have never been recorded",
        detail: "Either nobody is reaching them, or they are not worth keeping.",
        to: "/admin/prompts",
        tone: "warn" as const,
      },
      {
        id: "unpaid",
        count: unpaid,
        title: "contributors are owed money",
        detail: "Run a payment to clear the backlog.",
        to: "/admin/payments",
        tone: "warn" as const,
      },
    ].filter((item) => item.count > 0);
  }, [forceEmpty]);

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

      {isLoading ? (
        <AdminPageSkeleton charts={4} chartColumns={2} table={false} />
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
          title="Approved"
          value={formatHours(corpus.approvedHours)}
          trend={{
            label: corpus.totalHours ? `${approvalRate}% of corpus` : "",
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
          title="Focus groups"
          value={String(corpus.sessions)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={Microphone3}
        />
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-6">
        <AlvaChartCard
          title="Corpus growth"
          subtitle="Cumulative hours collected"
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
          <CorpusGrowthChart data={corpus.growth} window={range} />
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

      {/* Collection type is already the sankey's left column, so it is not
          repeated here — this row is the two questions the flow cannot answer. */}
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
