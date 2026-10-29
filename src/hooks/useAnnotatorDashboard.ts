import { useMemo } from "react";
import { annotatorDashboard, type ApiDailyActivity } from "@/lib/api/dashboard";
import { useApiResource } from "@/hooks/useApiResource";
import type { HeatmapColumn } from "@/components/charts/heatmap";
import { NO_VALUE } from "@/lib/no-value";
import type { DashboardTimeRange } from "@/data/internDashboard";
import { toDemographicSpeakers } from "@/data/internDashboard";
import type { ApiTagBreakdown } from "@/lib/api/dashboard";
import type { SunburstNode } from "@/components/charts/sunburst-data";
import type { SpanKind } from "@/lib/annotation/tags";
import { NON_SPEECH_COLOR, tagColor, tagFamily, tagLabel } from "@/lib/annotation/tags";

/**
 * `daily_activity` → the calendar shape the activity chart reads.
 *
 * The API sends a flat list of days; the chart wants weeks as columns and days
 * as bins, because it shares that structure with the heatmap. The series is
 * padded backwards to a Sunday boundary so week columns line up with real
 * weeks rather than with wherever the range happened to start.
 */
function toHeatmapColumns(daily: ApiDailyActivity[]): HeatmapColumn[] {
  if (daily.length === 0) return [];

  const points = daily
    .map((entry) => ({ date: new Date(`${entry.date}T00:00:00`), count: entry.count }))
    .filter((point) => !Number.isNaN(point.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (points.length === 0) return [];

  // Pad to the Sunday on or before the first day, so column 0 is a full week.
  const lead = points[0].date.getDay();
  const padded = [
    ...Array.from({ length: lead }, (_, index) => {
      const date = new Date(points[0].date);
      date.setDate(date.getDate() - (lead - index));
      return { date, count: 0 };
    }),
    ...points,
  ];

  const columns: HeatmapColumn[] = [];
  for (let start = 0; start < padded.length; start += 7) {
    const week = padded.slice(start, start + 7);
    columns.push({
      bin: columns.length,
      bins: week.map((point, day) => ({
        bin: day,
        count: point.count,
        date: point.date,
      })),
    });
  }

  return columns;
}

/** Whole-number metric, or an em dash when there is genuinely nothing. */
function count(value: number | undefined) {
  return value == null ? NO_VALUE : value.toLocaleString();
}

/** How many days of `daily_activity` each filter shows. */
const RANGE_DAYS: Record<DashboardTimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

/**
 * `tag_breakdown` → the sunburst's two rings.
 *
 * Family on the inside, the values within it on the outside, which is the
 * shape the API actually has. It used to be variety → family → tag, and the
 * variety ring was invented: nothing reports which tags were applied to which
 * language, so that ring could only ever have been made up.
 *
 * Families with nothing in them are left out rather than drawn as zero-width
 * slivers, and an annotator who has tagged nothing gets no node at all, which
 * the card reads as its empty state.
 */
function toTagSunburst(breakdown: ApiTagBreakdown | undefined): SunburstNode {
  const families: { kind: SpanKind; counts: Record<string, number> }[] = [
    { kind: "language", counts: breakdown?.by_language ?? {} },
    { kind: "disfluency", counts: breakdown?.by_disfluency ?? {} },
    { kind: "untranscribable", counts: breakdown?.by_untranscribable_reason ?? {} },
  ];

  const children: SunburstNode[] = families
    .map(({ kind, counts }) => ({
      name: tagFamily(kind).label,
      color: tagColor(kind),
      children: Object.entries(counts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ name: tagLabel(kind, value), value: count })),
    }))
    .filter((family) => family.children.length > 0);

  /* Non-speech events are their own family at the API and have no span kind,
   * so they carry the colour the workspace already paints them. */
  const nonSpeech = Object.entries(breakdown?.by_non_speech_event ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ name: value, value: count }));

  if (nonSpeech.length > 0) {
    children.push({
      name: "Non-speech",
      color: NON_SPEECH_COLOR,
      children: nonSpeech,
    });
  }

  return { name: "Tags", children };
}

export function useAnnotatorDashboard(range: DashboardTimeRange = "30d") {
  const { data, isLoading, error, reload } = useApiResource(annotatorDashboard, []);

  /* `daily_activity` is the full 365 days in one response, so the filter is a
   * slice rather than a refetch. The totals beside it have no window at the
   * API, which is why they do not move with it. */
  const activity = useMemo(
    () =>
      data
        ? toHeatmapColumns(data.daily_activity.slice(-RANGE_DAYS[range]))
        : [],
    [data, range]
  );

  const metrics = useMemo(
    () => ({
      clipsAnnotated: count(data?.segments_created),
      hoursAnnotated: data ? `${data.hours_annotated.toFixed(1)}h` : NO_VALUE,
      tagsApplied: count(data?.tags_applied),
      sessionsAnnotated: count(data?.sessions_annotated),
      queueAvailable: count(data?.queue_available),
      /* No trends: the endpoint returns current totals, not a
       * period-over-period comparison, so there is no honest arrow to draw. */
      periodLabel: "",
    }),
    [data]
  );

  const tagBreakdown = useMemo(
    () => toTagSunburst(data?.tag_breakdown),
    [data]
  );

  /* Speakers across the sessions this annotator has worked. Each speaker
   * counts once per session now, where it used to count once per annotation
   * held on that session, so these figures read lower than they did. */
  const demographics = useMemo(
    () =>
      toDemographicSpeakers(data?.speaker_demographics.by_gender_age ?? []),
    [data]
  );

  return {
    data,
    metrics,
    activity,
    tagBreakdown,
    demographics,
    isLoading,
    error,
    reload,
  };
}
