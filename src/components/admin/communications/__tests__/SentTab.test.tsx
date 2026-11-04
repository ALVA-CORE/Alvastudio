import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

const person = (index: number) => ({
  id: `r${index}`,
  user_id: `u${index}`,
  full_name: `Person ${index}`,
  email: `p${index}@example.com`,
  status: "pending",
  attempts: 0,
  sent_at: null,
  error: null,
});
const everyone = Array.from({ length: 120 }, (_, index) => person(index));
const sending = {
  id: "m1",
  subject: "Guidance update",
  status: "sending",
  queued_at: "2026-11-04T10:00:00Z",
  updated_at: "2026-11-04T10:00:00Z",
  delivery: { total: 120, pending: 120, sent: 0, failed: 0, skipped: 0, removed: 0 },
};

vi.mock("@/lib/api/communications", () => ({
  listCommunications: vi.fn(async () => ({ items: [sending], total: 1, limit: 50, offset: 0 })),
  getCommunication: vi.fn(async () => sending),
  listCommunicationRecipients: vi.fn(async (_id: string, { limit, offset }: { limit: number; offset: number }) => ({
    items: everyone.slice(offset, offset + limit),
    total: everyone.length,
    limit,
    offset,
  })),
}));

const { SentTab } = await import("../SentTab");

describe("SentTab", () => {
  afterEach(() => vi.useRealTimers());

  /* The bug: "more" opened them, and the next refresh while it was still
     sending put the list back to its first page. */
  it("keeps what 'more' opened through a refresh", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SentTab version={0} />);

    (await screen.findByText("Guidance update")).click();
    expect(await screen.findByText("Person 49")).toBeInTheDocument();
    expect(screen.queryByText("Person 50")).not.toBeInTheDocument();

    (await screen.findByText("70 more")).click();
    expect(await screen.findByText("Person 99")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByText("Person 99")).toBeInTheDocument();
  });
});
