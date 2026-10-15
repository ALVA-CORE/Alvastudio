import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const listNotifications = vi.fn();
const markRead = vi.fn();

vi.mock("@/lib/api/notifications", () => ({
  listNotifications: (...args: unknown[]) => listNotifications(...args),
  markRead: (...args: unknown[]) => markRead(...args),
  unreadCount: vi.fn(),
}));

import { useNotifications } from "@/hooks/useNotifications";

const rows = [
  { key: "review:1", kind: "recording_approved", title: "Approved", body: "b", created_at: new Date().toISOString(), read: false },
  { key: "annotation:2:needs_rework", kind: "annotation_needs_rework", title: "Sent back", body: "b", created_at: new Date().toISOString(), read: false },
  { key: "payout:3", kind: "payout_sent", title: "Paid", body: "b", created_at: new Date().toISOString(), read: true },
];

beforeEach(() => {
  listNotifications.mockReset().mockResolvedValue({
    items: rows.map((row) => ({ ...row })),
    total: rows.length,
    limit: 50,
    offset: 0,
  });
  markRead.mockReset().mockResolvedValue({ marked: 1, unread: 0 });
});

describe("useNotifications", () => {
  it("counts unread from the rows it holds", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unread).toBe(2);
  });

  it("sends the opaque key back verbatim when one is read", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markOneRead("annotation:2:needs_rework");
    });

    expect(markRead).toHaveBeenCalledWith({ keys: ["annotation:2:needs_rework"] });
    expect(result.current.unread).toBe(1);
  });

  /* Sending only the keys on screen would leave a badge showing a number
   * nobody could clear, because it counts rows this client never loaded. */
  it("clears everything with {all: true}, not with the loaded keys", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(markRead).toHaveBeenCalledWith({ all: true });
    expect(result.current.unread).toBe(0);
  });

  /* Idempotent at the API, so the worst case is a dot that returns on the
   * next load. A list that will not respond to being read is worse. */
  it("keeps the optimistic read when the call fails", async () => {
    markRead.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markOneRead("review:1");
    });

    expect(result.current.unread).toBe(1);
  });
});
