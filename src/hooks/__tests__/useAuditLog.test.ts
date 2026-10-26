import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auditLog = vi.fn();
vi.mock("@/lib/api/audit", () => ({ auditLog: (...args: unknown[]) => auditLog(...args) }));

const { useAuditLog } = await import("../useAuditLog");

/** One page of `n` events, numbered from `from` so appends are checkable. */
function page(from: number, n: number, total: number) {
  return {
    total,
    items: Array.from({ length: n }, (_, i) => ({
      id: `e-${from + i}`,
      at: new Date(2026, 9, 26 - (from + i)).toISOString(),
      actor_id: null,
      actor_name: null,
      actor_role: null,
      automatic: true,
      action: "auth.signed_in",
      subject_type: "user" as const,
      subject_id: "u-1",
      detail: `Event ${from + i}`,
    })),
  };
}

/**
 * Paging is what lets sign-ins share the list with everything else.
 *
 * Several hundred sign-ins a year against a few dozen real account events
 * would otherwise push a password change off the end of a fixed fetch, and
 * an admin reading to the bottom would conclude nothing had happened. So the
 * two things worth testing are that more can be fetched, and that the count
 * says how much is left.
 */
describe("useAuditLog", () => {
  beforeEach(() => {
    auditLog.mockReset();
  });

  it("asks for sign-ins when told to, and leaves them out otherwise", async () => {
    auditLog.mockResolvedValue(page(0, 1, 1));

    renderHook(() => useAuditLog("user", "u-1", true, "include"));
    await waitFor(() => expect(auditLog).toHaveBeenCalled());
    expect(auditLog.mock.calls[0][0]).toMatchObject({ sign_ins: "include" });
    expect(auditLog.mock.calls[0][0].offset).toBeUndefined();

    auditLog.mockClear();
    renderHook(() => useAuditLog("recording", "r-1"));
    await waitFor(() => expect(auditLog).toHaveBeenCalled());
    expect(auditLog.mock.calls[0][0]).toMatchObject({ sign_ins: "exclude" });
  });

  it("appends the next page rather than replacing the list", async () => {
    auditLog.mockResolvedValueOnce(page(0, 50, 120));
    const { result } = renderHook(() => useAuditLog("user", "u-1", true, "include"));

    await waitFor(() => expect(result.current.entries).toHaveLength(50));
    expect(result.current.hasMore).toBe(true);
    expect(result.current.total).toBe(120);

    auditLog.mockResolvedValueOnce(page(50, 50, 120));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(auditLog.mock.calls[1][0]).toMatchObject({ offset: 50 });
    expect(result.current.entries).toHaveLength(100);
    expect(result.current.entries[0].label).toBe("Event 0");
    expect(result.current.entries[50].label).toBe("Event 50");
    expect(result.current.hasMore).toBe(true);
  });

  it("stops offering more once the list is whole", async () => {
    auditLog.mockResolvedValueOnce(page(0, 12, 12));
    const { result } = renderHook(() => useAuditLog("user", "u-1", true, "include"));

    await waitFor(() => expect(result.current.entries).toHaveLength(12));
    expect(result.current.hasMore).toBe(false);
  });

  it("does not append one account's history onto another", async () => {
    /* The panel can be moved to a different user while a Load more is still
       in flight. Appending then would interleave two people's events under
       one name, which is worse than losing the page. */
    auditLog.mockResolvedValueOnce(page(0, 50, 120));
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useAuditLog("user", id, true, "include"),
      { initialProps: { id: "u-1" } }
    );

    await waitFor(() => expect(result.current.entries).toHaveLength(50));

    let release: (value: unknown) => void = () => {};
    auditLog.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));

    let pending: Promise<void>;
    act(() => {
      pending = result.current.loadMore();
    });

    /* Second user opened, first page lands for them. */
    auditLog.mockResolvedValueOnce(page(900, 3, 3));
    rerender({ id: "u-2" });
    await waitFor(() => expect(result.current.entries).toHaveLength(3));

    await act(async () => {
      release(page(50, 50, 120));
      await pending;
    });

    expect(result.current.entries).toHaveLength(3);
    expect(result.current.entries[0].label).toBe("Event 900");
  });
});
