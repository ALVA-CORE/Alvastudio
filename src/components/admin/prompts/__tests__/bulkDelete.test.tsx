import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";
import type { ApiBankBulkDelete, ApiPrompt } from "@/lib/api/catalog";

const prompt = (id: string, used: number): ApiPrompt => ({
  id,
  text: `Prompt ${id}`,
  language_variety: "nigerian_english",
  category: null,
  used_by_count: used,
  is_active: true,
  created_by: null,
  created_at: "2026-11-01T00:00:00Z",
});

const split = (over: Partial<ApiBankBulkDelete>): ApiBankBulkDelete => ({
  applied: false,
  matched: 2,
  deleted: 1,
  retired: 1,
  already_retired: 0,
  holds_released: 0,
  not_found: [],
  ...over,
});

const bulk = vi.fn<(kind: string, ids: string[], expected?: number) => Promise<ApiBankBulkDelete>>();

vi.mock("@/lib/api/catalog", () => {
  const items = [prompt("p1", 0), prompt("p2", 3)];
  const page = { items, total: items.length, limit: 25, offset: 0 };
  return {
    DEFAULT_TARGET_PARTICIPANTS: 8,
    MIN_TARGET_PARTICIPANTS: 1,
    MAX_TARGET_PARTICIPANTS: 50,
    listPromptsPage: vi.fn(async () => page),
    listStimuliPage: vi.fn(async () => page),
    listTopicsPage: vi.fn(async () => ({ items: [], total: 0, limit: 200, offset: 0 })),
    bulkDeleteBankItems: (kind: string, ids: string[], expected?: number) => bulk(kind, ids, expected),
    createTopic: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
    createBankItem: vi.fn(),
    updateBankItem: vi.fn(),
    deleteBankItem: vi.fn(),
    importBank: vi.fn(),
  };
});

const { default: AdminPromptsPage } = await import("@/pages/admin/AdminPromptsPage");

describe("deleting ticked rows", () => {
  /* Preview, confirm with the split, apply with `expected`. A 409 shows the
     server's words and previews again before anything is applied. */
  it("previews, then applies with the matched count, and previews again on a 409", async () => {
    const error = vi.spyOn(alvaToast, "error");
    bulk
      .mockResolvedValueOnce(split({}))
      .mockRejectedValueOnce(new ApiError(409, "The selection changed. Preview again."))
      .mockResolvedValueOnce(split({ matched: 1, deleted: 0, retired: 1, not_found: ["p1"] }))
      .mockResolvedValueOnce(split({ applied: true, matched: 1, deleted: 0, retired: 1, not_found: ["p1"] }));

    render(
      <MemoryRouter>
        <AdminPromptsPage />
      </MemoryRouter>
    );

    const boxes = await screen.findAllByRole("checkbox", { name: "Select row" });
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[1]);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(bulk.mock.calls[0]).toEqual(["prompt", ["p1", "p2"], undefined]);
    expect(within(dialog).getByText("Delete 2 prompts?")).toBeInTheDocument();
    expect(within(dialog).getByText("1 deleted, 1 retired because it was used")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("The selection changed. Preview again."));
    expect(bulk.mock.calls[1]).toEqual(["prompt", ["p1", "p2"], 2]);

    expect(await within(dialog).findByText("Delete 1 prompt?")).toBeInTheDocument();
    expect(within(dialog).getByText("1 retired because it was used, 1 already gone")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(bulk).toHaveBeenCalledTimes(4));
    expect(bulk.mock.calls[3]).toEqual(["prompt", ["p1", "p2"], 1]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
