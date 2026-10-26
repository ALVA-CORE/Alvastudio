import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewQualityForm } from "../ReviewQualityForm";
import type { QualityAnswers } from "@/data/reviewQueue";

/**
 * A submitted review is a record, not a form.
 *
 * It used to render live radios and a Submit button whatever the clip's
 * status, so an intern opening a clip they had already decided could change
 * what they had said. The API refuses a second verdict on the same recording,
 * so the only possible outcome was a refusal after the work of filling it in.
 */
const SUBMITTED: QualityAnswers = {
  noiseFree: "no",
  audible: "yes",
  matchesPrompt: "yes",
  natural: "yes",
  verdict: "reject",
};

const EMPTY: QualityAnswers = {
  noiseFree: null,
  audible: null,
  matchesPrompt: null,
  natural: null,
  verdict: null,
};

describe("ReviewQualityForm, once submitted", () => {
  it("shows what the reviewer chose", () => {
    render(
      <ReviewQualityForm
        readOnly
        answers={SUBMITTED}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const chosen = screen
      .getAllByRole("radio")
      .filter((radio) => radio.getAttribute("aria-checked") === "true");

    expect(chosen).toHaveLength(4);
  });

  it("cannot be changed or resubmitted", async () => {
    const onChange = vi.fn();
    render(
      <ReviewQualityForm
        readOnly
        answers={SUBMITTED}
        onChange={onChange}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Submit review" })
    ).not.toBeInTheDocument();

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }

    await userEvent.click(screen.getAllByRole("radio")[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still takes answers while a verdict is open", async () => {
    const onChange = vi.fn();
    render(
      <ReviewQualityForm answers={EMPTY} onChange={onChange} onSubmit={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Submit review" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("radio")[0]);
    expect(onChange).toHaveBeenCalled();
  });
});
