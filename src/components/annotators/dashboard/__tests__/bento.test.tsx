import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotatorBentoGrid } from "@/components/annotators/dashboard/AnnotatorBentoGrid";
import { AnnotatorBentoSkeleton } from "@/components/annotators/dashboard/AnnotatorBentoSkeleton";
import {
  ANNOTATOR_DASHBOARD_DATA,
  getEmptyAnnotatorDataset,
} from "@/data/annotators/dashboard";
import { buildActivitySeries } from "@/components/annotators/dashboard/AnnotatorActivityChart";

/**
 * The dashboard is the annotator's landing page, so a render crash here locks
 * the whole surface. Typecheck and build both pass on a chart that throws at
 * mount, which is exactly how that class of bug reaches production — these
 * mount the real components against the real datasets.
 */

const RANGES = ["7d", "30d", "90d", "12m"] as const;

describe("AnnotatorBentoGrid", () => {
  it.each(RANGES)("renders without crashing for the %s range", (range) => {
    const { container } = render(
      <AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA[range]} range={range} />
    );
    expect(container).toBeTruthy();
  });

  it("renders the three annotator-scoped tiles", () => {
    render(<AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA["30d"]} range="30d" />);

    expect(screen.getByText("Your activity")).toBeInTheDocument();
    expect(screen.getByText("Clips annotated per day")).toBeInTheDocument();
    expect(screen.getByText("Tag mix")).toBeInTheDocument();
    expect(screen.getByText("Demographic reach")).toBeInTheDocument();
  });

  it("does not render the admin-scoped charts", () => {
    render(<AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA["30d"]} range="30d" />);

    expect(screen.queryByText("Clip flow")).not.toBeInTheDocument();
    expect(screen.queryByText("Agreement")).not.toBeInTheDocument();
    expect(screen.queryByText("Annotation activity")).not.toBeInTheDocument();
  });

  it("describes the bucket the selected range actually plots", () => {
    const { rerender } = render(
      <AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA["90d"]} range="90d" />
    );
    expect(screen.getByText("Clips annotated per week")).toBeInTheDocument();

    rerender(
      <AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA["12m"]} range="12m" />
    );
    expect(screen.getByText("Clips annotated per month")).toBeInTheDocument();
  });

  it("renders the empty dataset without crashing", () => {
    const { container } = render(
      <AnnotatorBentoGrid dataset={getEmptyAnnotatorDataset("30d")} range="30d" isEmpty />
    );
    expect(container).toBeTruthy();
  });
});

describe("activity series", () => {
  it("windows each range to the days it claims", () => {
    // The shared dataset is built in WEEKS for the heatmap — the "7d" entry
    // holds eight of them. Plotting it whole is what made a 7d chart span two
    // months on the axis.
    const seven = buildActivitySeries(ANNOTATOR_DASHBOARD_DATA["7d"].activity, "7d");
    expect(seven.length).toBeLessThanOrEqual(7);

    const thirty = buildActivitySeries(ANNOTATOR_DASHBOARD_DATA["30d"].activity, "30d");
    expect(thirty.length).toBeLessThanOrEqual(30);
  });

  it("buckets the long ranges instead of plotting every day", () => {
    const ninety = buildActivitySeries(ANNOTATOR_DASHBOARD_DATA["90d"].activity, "90d");
    const year = buildActivitySeries(ANNOTATOR_DASHBOARD_DATA["12m"].activity, "12m");

    // ~13 weekly points and ~12 monthly points, not 90 and 365.
    expect(ninety.length).toBeLessThanOrEqual(16);
    expect(year.length).toBeLessThanOrEqual(14);
  });

  it("returns points in chronological order", () => {
    for (const range of RANGES) {
      const series = buildActivitySeries(ANNOTATOR_DASHBOARD_DATA[range].activity, range);
      for (let i = 1; i < series.length; i += 1) {
        expect(series[i].date.getTime()).toBeGreaterThan(series[i - 1].date.getTime());
      }
    }
  });

  it("never plots a future date", () => {
    const now = Date.now();
    for (const range of RANGES) {
      for (const point of buildActivitySeries(ANNOTATOR_DASHBOARD_DATA[range].activity, range)) {
        expect(point.date.getTime()).toBeLessThanOrEqual(now);
      }
    }
  });

  it("smooths without shifting the series sideways", () => {
    // A centred window keeps peaks where they happened; a trailing one drags
    // them right, which misreads against the date axis.
    const series = buildActivitySeries(ANNOTATOR_DASHBOARD_DATA["30d"].activity, "30d");
    expect(series.length).toBeGreaterThan(3);
    expect(series.every((p) => Number.isFinite(p.clips) && p.clips >= 0)).toBe(true);
  });
});

describe("AnnotatorBentoSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<AnnotatorBentoSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});
