import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserActivitySection } from "../UserActivitySection";
import type { ApiUserActivity } from "@/lib/api/users";

const base = {
  user_id: "intern-1",
  window_days: 365,
  start_date: "2025-11-10",
  end_date: "2026-11-09",
  unit: "verdicts",
  daily: [],
  total: 0,
  active_days: 0,
  best_streak: 0,
  contributor: null,
  annotator: null,
} as const;

const intern = {
  ...base,
  role: "intern",
  intern: {
    clips_reviewed: 40,
    approved: 30,
    rejected: 6,
    flagged: 4,
    sessions_run: 3,
    participants: 18,
    clips_assigned: 25,
    assigned_reviewed: 18,
    on_desk: 5,
    taken_back: 2,
  },
} as unknown as ApiUserActivity;

function renderSection(activity: ApiUserActivity) {
  return render(
    <MemoryRouter>
      <UserActivitySection activity={activity} name="Ada Obi" />
    </MemoryRouter>
  );
}

describe("UserActivitySection, intern", () => {
  it("links the heading to every clip they reviewed", () => {
    renderSection(intern);
    expect(screen.getByRole("link", { name: "See every clip they reviewed" })).toHaveAttribute(
      "href",
      "/admin/reviews?judged_by=intern-1&name=Ada%20Obi"
    );
  });

  /* The verdict counts are the chart's legend now, not a list above it. */
  it("names the verdicts in a legend, and keeps the rest as fields", () => {
    renderSection(intern);
    expect(screen.queryByText("Clips reviewed")).not.toBeInTheDocument();
    expect(screen.getByText("Sessions run")).toBeInTheDocument();
    for (const item of screen.getAllByText("Approved")) {
      expect(within(item.closest("li") as HTMLElement).getByText("30")).toBeInTheDocument();
    }
  });

  /* The three parts of what was dealt fill it, and nothing is made up. */
  it("fills the bar with what became of the clips dealt to them", () => {
    renderSection(intern);
    const bar = screen.getByRole("progressbar", { name: "Clips reviewed of those assigned" });
    expect(bar).toHaveAttribute("aria-valuenow", "18");
    expect(bar).toHaveAttribute("aria-valuemax", "25");
    expect(bar.children).toHaveLength(3);
    expect(within(screen.getByText("On desk").closest("li") as HTMLElement).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByText("Taken back").closest("li") as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("Sample")).not.toBeInTheDocument();
  });

  it("has no assigned bar for anyone but an intern", () => {
    renderSection({ ...base, role: "admin", intern: null } as unknown as ApiUserActivity);
    expect(screen.queryByText("Assigned and reviewed")).not.toBeInTheDocument();
  });
});
