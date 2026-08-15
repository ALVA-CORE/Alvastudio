import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotatorBentoGrid } from "@/components/annotators/dashboard/AnnotatorBentoGrid";
import { AnnotatorBentoSkeleton } from "@/components/annotators/dashboard/AnnotatorBentoSkeleton";
import {
  ANNOTATOR_DASHBOARD_DATA,
  getEmptyAnnotatorDataset,
} from "@/data/annotators/dashboard";

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
      <AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA[range]} />
    );
    expect(container).toBeTruthy();
  });

  it("renders the three annotator-scoped tiles", () => {
    render(<AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA["30d"]} />);

    expect(screen.getByText("Your activity")).toBeInTheDocument();
    expect(screen.getByText("Tag mix")).toBeInTheDocument();
    expect(screen.getByText("Demographic reach")).toBeInTheDocument();
  });

  it("does not render the admin-scoped charts", () => {
    render(<AnnotatorBentoGrid dataset={ANNOTATOR_DASHBOARD_DATA["30d"]} />);

    expect(screen.queryByText("Clip flow")).not.toBeInTheDocument();
    expect(screen.queryByText("Agreement")).not.toBeInTheDocument();
    expect(screen.queryByText("Annotation activity")).not.toBeInTheDocument();
  });

  it("renders the empty dataset without crashing", () => {
    const { container } = render(
      <AnnotatorBentoGrid dataset={getEmptyAnnotatorDataset("30d")} isEmpty />
    );
    expect(container).toBeTruthy();
  });
});

describe("AnnotatorBentoSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<AnnotatorBentoSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});
