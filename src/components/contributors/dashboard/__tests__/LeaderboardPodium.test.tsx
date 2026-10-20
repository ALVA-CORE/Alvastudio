import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeaderboardPodium } from "../LeaderboardPodium";
import { toPodium } from "@/data/contributors/dashboard";

/**
 * The board has to survive an early corpus.
 *
 * `/points/leaderboard` caps at three, but it returns whoever is actually
 * ranked — which on a new corpus is one person. The podium used to take its
 * entries in display order, so a single contributor landed in the second-place
 * slot and the board returned null, and two contributors crashed it.
 */

const row = (id: string, name: string, points: number) => ({
  contributor_id: id,
  full_name: name,
  points,
});

describe("LeaderboardPodium", () => {
  it("shows the one person who is ranked", () => {
    render(<LeaderboardPodium entries={toPodium([row("a", "Ada Obi", 120)])} />);

    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("shows two without crashing on the missing third", () => {
    render(
      <LeaderboardPodium
        entries={toPodium([row("a", "Ada Obi", 120), row("b", "Bola Eze", 90)])}
      />
    );

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Bola")).toBeInTheDocument();
  });

  it("puts second on the left and first in the middle", () => {
    const { container } = render(
      <LeaderboardPodium
        entries={toPodium([
          row("a", "Ada Obi", 120),
          row("b", "Bola Eze", 90),
          row("c", "Chidi Nwosu", 60),
        ])}
      />
    );

    const names = Array.from(container.querySelectorAll("p"))
      .map((node) => node.textContent)
      .filter((text) => text && ["Ada", "Bola", "Chidi"].includes(text));

    expect(names).toEqual(["Bola", "Ada", "Chidi"]);
  });

  it("says the board is empty rather than rendering nothing", () => {
    /* A card that simply ends under the points balance looks like something
       failed to load, which is what an empty leaderboard looked like. */
    render(<LeaderboardPodium entries={toPodium([])} />);

    expect(screen.getByText("Nobody on the board yet")).toBeInTheDocument();
  });
});
