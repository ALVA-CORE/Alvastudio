import { useMemo } from "react";
import { Link } from "react-router-dom";
import GraphUp from "@solar-icons/react/business/GraphUp";
import ArrowRightUp from "@solar-icons/react/arrows/ArrowRightUp";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
import { SharePie } from "@/components/admin/shared/SharePie";
import { DetailField, DetailGroup } from "@/components/admin/shared/detail";
import {
  UserActivityHeatmap,
  toHeatmapColumns,
} from "@/components/admin/users/UserActivityHeatmap";
import type { ApiUserActivity } from "@/lib/api/users";
import { cn } from "@/lib/utils";

/** Kept, waiting, lost — the accent only for the part that counted. */
const OUTCOME_PALETTE = [
  "hsl(146 87% 54%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 55%)",
  "hsl(220 9% 46%)",
];

type Outcome = {
  title: string;
  /** Where the work itself can be seen, filtered to this person. */
  link?: string;
  fields: { label: string; value: string }[];
  slices: { label: string; hours: number }[];
  centerLabel: string;
  rate: number;
  rateLabel: string;
};

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * What became of the work, by role.
 *
 * The slices are the statuses that are settled plus the ones that are not,
 * and they sum to the same figure printed above them, so the pie and the
 * numbers cannot drift apart. The gauge is the one rate worth a glance:
 * what share of the work was kept.
 *
 * Nothing here is derived from anything else. Every figure is a field the
 * API sent, because the tab this replaces computed its own and ended up
 * showing "0 recordings" beside "5.7 hours contributed".
 */
function outcomeOf(activity: ApiUserActivity): Outcome | null {
  if (activity.contributor) {
    const { submitted, approved, rejected, flagged, pending } = activity.contributor;
    return {
      title: "What became of the clips",
      fields: [
        { label: "Submitted", value: String(submitted) },
        { label: "Approved", value: String(approved) },
        { label: "Rejected", value: String(rejected) },
        { label: "Flagged", value: String(flagged) },
        { label: "Waiting on review", value: String(pending) },
      ],
      slices: [
        { label: "Approved", hours: approved },
        { label: "Waiting", hours: pending },
        { label: "Rejected", hours: rejected },
        { label: "Flagged", hours: flagged },
      ],
      centerLabel: "Clips",
      rate: percent(approved, submitted),
      rateLabel: "Approved",
    };
  }

  if (activity.intern) {
    const { clips_reviewed, approved, rejected, flagged, sessions_run, participants } =
      activity.intern;
    return {
      title: "Verdicts and sessions",
      link: `/admin/reviews?judged_by=${encodeURIComponent(activity.user_id)}`,
      /* The verdict counts are the chart (hover a slice); these two are
         not in it. */
      fields: [
        { label: "Sessions run", value: String(sessions_run) },
        { label: "Participants", value: String(participants) },
      ],
      slices: [
        { label: "Approved", hours: approved },
        { label: "Flagged", hours: flagged },
        { label: "Rejected", hours: rejected },
      ],
      centerLabel: "Verdicts",
      /* Labelled "Clips approved", not "quality": a reviewer who approves
         more is not by that fact a better reviewer. */
      rate: percent(approved, clips_reviewed),
      rateLabel: "Clips approved",
    };
  }

  if (activity.annotator) {
    const {
      annotations_started,
      submitted,
      approved,
      sent_back,
      rejected,
      segments_created,
    } = activity.annotator;

    /* Clamped: an annotation opened before the window can be settled inside
       it, which would otherwise read as a negative slice. */
    const open = Math.max(annotations_started - approved - sent_back - rejected, 0);

    return {
      title: "What became of the annotations",
      fields: [
        { label: "Started", value: String(annotations_started) },
        { label: "Submitted", value: String(submitted) },
        { label: "Approved", value: String(approved) },
        { label: "Sent back", value: String(sent_back) },
        { label: "Rejected", value: String(rejected) },
        { label: "Segments created", value: String(segments_created) },
      ],
      slices: [
        { label: "Approved", hours: approved },
        { label: "Sent back", hours: sent_back },
        { label: "Rejected", hours: rejected },
        { label: "Still open", hours: open },
      ],
      centerLabel: "Annotations",
      rate: percent(approved, submitted),
      rateLabel: "Approved",
    };
  }

  /* An admin. There is nothing to approve or reject about an admin action,
     so the calendar and the totals are the whole story. */
  return null;
}

/**
 * One person's year, from `GET /users/{id}/activity`.
 *
 * Every noun on this tab comes from the response's `unit` rather than from a
 * lookup here. What one count means is the API's to say — a clip, a verdict,
 * a segment, an admin action — and a label chosen on this side would be a
 * second opinion about somebody else's numbers.
 */
export function UserActivitySection({
  activity,
  name,
}: {
  activity: ApiUserActivity | null | undefined;
  /** Shown on the reviews page's "Reviewed by" filter. */
  name?: string;
}) {
  const columns = useMemo(
    () => (activity ? toHeatmapColumns(activity.daily) : []),
    [activity]
  );

  if (activity === undefined) {
    return (
      <div className="mt-2 space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (activity === null) {
    return (
      <AlvaEmptyState
        className="mt-2"
        icon={<GraphUp size={20} weight="Outline" />}
        title="Could not load this"
        description="Their activity did not come back. Close the panel and open it again."
      />
    );
  }

  const outcome = outcomeOf(activity);
  const perActiveDay =
    activity.active_days > 0
      ? Math.round((activity.total / activity.active_days) * 10) / 10
      : 0;

  return (
    <>
      <DetailGroup title={`Last ${Math.round(activity.window_days / 30)} months`} first>
        <DetailField label="Total" value={`${activity.total} ${activity.unit}`} span />
        <DetailField label="Active days" value={String(activity.active_days)} />
        <DetailField label="Best streak" value={`${activity.best_streak} days`} />
        <DetailField label="Per active day" value={String(perActiveDay)} />
      </DetailGroup>

      <section className="mt-6 border-t border-alva-border pt-6">
        <h3 className="text-sm font-medium text-foreground">Contribution graph</h3>
        <div className="mt-3">
          {activity.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing recorded in this window.
            </p>
          ) : (
            <UserActivityHeatmap data={columns} />
          )}
        </div>
      </section>

      {activity.intern ? <AssignedProgress counts={activity.intern} /> : null}

      {outcome ? (
        <>
          <DetailGroup
            title={
              <>
                {outcome.title}
                {outcome.link ? (
                  <Link
                    to={`${outcome.link}${name ? `&name=${encodeURIComponent(name)}` : ""}`}
                    aria-label="See every clip they reviewed"
                    title="See every clip they reviewed"
                    className="rounded-full text-alva-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                  >
                    <ArrowRightUp size={16} weight="Linear" />
                  </Link>
                ) : null}
              </>
            }
          >
            {outcome.fields.map((field) => (
              <DetailField key={field.label} label={field.label} value={field.value} />
            ))}
          </DetailGroup>

          {outcome.slices.some((slice) => slice.hours > 0) ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="h-48 rounded-xl bg-alva-surface p-3">
                <SharePie
                  slices={outcome.slices}
                  centerLabel={outcome.centerLabel}
                  valueSuffix=""
                  palette={OUTCOME_PALETTE}
                />
              </div>
              <div className="h-48 rounded-xl bg-alva-surface p-3">
                <ApprovalGauge value={outcome.rate} label={outcome.rateLabel} />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

/**
 * What became of the clips dealt to them in the window.
 *
 * `clips_assigned` is always `assigned_reviewed` + `on_desk` + `taken_back`,
 * so the three fill the bar. Not the verdict counts above: those are every
 * verdict given in the window, second opinions and clips dealt earlier
 * included, so set against what was dealt they need not add up. Counted from
 * 23 Oct 2026, when assignments began to be recorded.
 */
function AssignedProgress({
  counts,
}: {
  counts: {
    clips_assigned: number;
    assigned_reviewed: number;
    on_desk: number;
    taken_back: number;
  };
}) {
  const assigned = counts.clips_assigned;
  const parts = [
    { label: "Reviewed", value: counts.assigned_reviewed, color: OUTCOME_PALETTE[0] },
    /* Cyan from the chart palette: apart from the green, still ours. */
    { label: "Pending", value: counts.on_desk, color: "hsl(187 72% 56%)" },
    { label: "Taken back", value: counts.taken_back, color: OUTCOME_PALETTE[3] },
  ];
  const width = (value: number) => `${assigned > 0 ? (value / assigned) * 100 : 0}%`;

  return (
    <section className="mt-6 border-t border-alva-border pt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Assigned and reviewed</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="text-foreground">{counts.assigned_reviewed.toLocaleString()}</span>{" "}
          reviewed · <span className="text-foreground">{assigned.toLocaleString()}</span> assigned
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Clips reviewed of those assigned"
        aria-valuemin={0}
        aria-valuemax={assigned}
        aria-valuenow={counts.assigned_reviewed}
        className="flex h-10 w-full overflow-hidden rounded-md bg-alva-surface"
      >
        {parts.map((part, index) =>
          part.value > 0 ? (
            <div
              key={part.label}
              className={cn("h-full transition-all", index > 0 && "border-l border-alva-bg/80")}
              style={{ width: width(part.value), background: part.color }}
            />
          ) : null
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: part.color }} />
            <span className="text-muted-foreground">{part.label}</span>
            <span className="tabular-nums text-foreground">{part.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
