import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiPrompt, CatalogPage, CatalogQuery } from "@/lib/api/catalog";

const listPromptsPage = vi.fn<(query: CatalogQuery) => Promise<CatalogPage>>();
const listStimuliPage = vi.fn<(query: CatalogQuery) => Promise<CatalogPage>>();

vi.mock("@/lib/api/catalog", () => ({
  listPromptsPage: (query: CatalogQuery) => listPromptsPage(query),
  listStimuliPage: (query: CatalogQuery) => listStimuliPage(query),
  listTopicsPage: vi.fn(),
  createBankItem: vi.fn(),
  createTopic: vi.fn(),
  deleteBankItem: vi.fn(),
  deleteTopic: vi.fn(),
  importBank: vi.fn(),
  updateBankItem: vi.fn(),
  updateTopic: vi.fn(),
}));

const { useBank } = await import("../useBank");

const prompt = (id: string): ApiPrompt => ({
  id,
  text: `Prompt ${id}`,
  language_variety: "nigerian_pidgin",
  category: null,
  used_by_count: 0,
  is_active: true,
  created_by: null,
  created_at: "2026-11-01T00:00:00Z",
});

/* The 2 Nov handoff's numbers: a bank of 9,990, twelve recorded, all of
   them far past the first page. */
function serve(query: CatalogQuery): Promise<CatalogPage> {
  const active = query.is_active === true;
  return Promise.resolve({
    items: query.limit === 1 ? [prompt("x")] : [prompt("a"), prompt("b")],
    total: query.recorded === true ? 12 : active ? 9_000 : 9_990,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
    bank_total: active ? 9_000 : 9_990,
    recorded_total: active ? 10 : 12,
  });
}

describe("useBank", () => {
  beforeEach(() => {
    listPromptsPage.mockReset().mockImplementation(serve);
    listStimuliPage.mockReset().mockImplementation(serve);
  });

  /* The bug: the cards counted the rows on one page, newest first, and the
     recorded prompts were never on it. */
  it("reads the headline numbers from the server, not the page", async () => {
    const { result } = renderHook(() =>
      useBank({ kind: "prompt", page: 1, pageSize: 25 })
    );
    await waitFor(() => expect(result.current.totals).not.toBeNull());

    expect(result.current.totals).toEqual({
      bank: 9_990,
      active: 9_000,
      recorded: 12,
      neverRecorded: 8_990,
    });
    expect(result.current.items).toHaveLength(2);
  });

  it("sends the page and the filters, and pages on `total`", async () => {
    const { result } = renderHook(() =>
      useBank({ kind: "prompt", isActive: true, recorded: true, page: 3, pageSize: 25 })
    );
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(listPromptsPage).toHaveBeenCalledWith({
      limit: 25,
      offset: 50,
      is_active: true,
      recorded: true,
    });
    /* `total` follows the recorded filter; the cards above do not. */
    expect(result.current.total).toBe(12);
    expect(result.current.totals?.bank).toBe(9_990);
  });

  /* Stimuli may not carry the new counts yet. A dash, not a zero. */
  it("falls back to `total`, and says nothing it was not told", async () => {
    listStimuliPage.mockImplementation((query) =>
      Promise.resolve({
        items: [],
        total: query.is_active ? 40 : 45,
        limit: query.limit ?? 50,
        offset: 0,
      })
    );
    const { result } = renderHook(() =>
      useBank({ kind: "stimulus", page: 1, pageSize: 25 })
    );
    await waitFor(() => expect(result.current.totals).not.toBeNull());

    expect(result.current.totals).toEqual({
      bank: 45,
      active: 40,
      recorded: null,
      neverRecorded: null,
    });
  });
});
