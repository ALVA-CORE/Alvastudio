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
const { NarrationsTab } = await import("../NarrationsTab");
const { useNarrations } = await import("@/hooks/useNarrations");

/* As the Sessions page uses them: the hook for the data and Take next, the
   tab for the table. */
function Harness() {
  const narrations = useNarrations();
  return (
    <>
      <span>{narrations.waiting} waiting</span>
      <button type="button" onClick={() => void narrations.take()}>
        Take next
      </button>
      <NarrationsTab rows={narrations.rows} isLoading={narrations.isLoading} />
    </>
  );
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/annotator/sessions"]}>
      <Routes>
        <Route path="/annotator/sessions" element={<Harness />} />
        <Route path="/annotator/narrations/:annotationId" element={<p>Workspace</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("useNarrations with NarrationsTab", () => {
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

  it("lists only this annotator's narrations, and counts the pool", async () => {
    renderPage();
    expect((await screen.findAllByText("A market you know")).length).toBeGreaterThan(0);
    expect(listMine).toHaveBeenCalledWith(expect.objectContaining({ kind: "narration" }));
    expect(screen.getByText("1 waiting")).toBeInTheDocument();
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
