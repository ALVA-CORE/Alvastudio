import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";

const claim = vi.fn();
const listMine = vi.fn();

vi.mock("@/lib/api/annotations", () => ({
  listNarrationQueue: vi.fn(async () => ({
    items: [
      {
        recording_id: "r9",
        stimulus_text: "Your first day at school",
        category: "memories",
        duration_seconds: 70,
        sent_at: "2026-11-17T08:00:00Z",
      },
    ],
    total: 1,
    limit: 200,
    offset: 0,
  })),
  listMine: (params: unknown) => listMine(params),
  claimNextNarration: () => claim(),
}));
vi.mock("@/lib/api/dashboard", () => ({
  annotatorDashboard: vi.fn(async () => ({ open_narration_claims: 1, narration_claim_limit: 10 })),
}));

const { default: AnnotatorNarrationsPage } = await import("../AnnotatorNarrationsPage");

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/annotator/narrations"]}>
      <Routes>
        <Route path="/annotator/narrations" element={<AnnotatorNarrationsPage />} />
        <Route path="/annotator/narrations/:annotationId" element={<p>Workspace</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AnnotatorNarrationsPage", () => {
  beforeEach(() => {
    claim.mockReset();
    listMine.mockReset().mockResolvedValue([
      {
        id: "a1",
        kind: "narration",
        session_id: null,
        recording_id: "r1",
        topic: "A market you know",
        status: "draft",
        duration_seconds: 95,
        created_at: "2026-11-17T09:00:00Z",
      },
    ]);
  });

  it("lists only this annotator's narrations, and their open count", async () => {
    renderPage();
    expect((await screen.findAllByText("A market you know")).length).toBeGreaterThan(0);
    expect(listMine).toHaveBeenCalledWith(expect.objectContaining({ kind: "narration" }));
    expect(await screen.findByText("1 of 10 open")).toBeInTheDocument();
  });

  it("takes the next narration and opens it in the workspace", async () => {
    claim.mockResolvedValueOnce({ id: "a2", kind: "narration" });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Take next" }));
    expect(await screen.findByText("Workspace")).toBeInTheDocument();
  });

  it("shows the API's sentence when there is nothing to take", async () => {
    const error = vi.spyOn(alvaToast, "error");
    claim.mockRejectedValueOnce(new ApiError(409, "You already hold 10 narrations."));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Take next" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("You already hold 10 narrations."));
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
  });
});
