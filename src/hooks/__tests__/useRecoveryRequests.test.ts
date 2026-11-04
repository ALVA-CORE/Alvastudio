import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listUserEmails = vi.fn();

vi.mock("@/lib/api/users", () => ({
  approvePasswordResetRequest: vi.fn(async () => ({})),
  denyPasswordResetRequest: vi.fn(async () => undefined),
  listPasswordResetRequests: vi.fn(async () => []),
  listUserEmails: (...args: unknown[]) => listUserEmails(...args),
}));

const { useRecoveryRequests } = await import("../useRecoveryRequests");

const email = (status: string) => ({
  items: [{ id: "e", kind: "reset_link", status, queued_at: "", sent_at: null, attempts: 0, error: null }],
  total: 1,
});

describe("resetEmailOutcome", () => {
  beforeEach(() => listUserEmails.mockReset());
  afterEach(() => vi.useRealTimers());

  /* The bug: asked once, straight after approving, it nearly always caught
     the email still in the outbox and said "still queued". */
  it("waits for the outbox worker instead of reporting the first look", async () => {
    listUserEmails
      .mockResolvedValueOnce(email("pending"))
      .mockResolvedValueOnce(email("pending"))
      .mockResolvedValueOnce(email("sent"));

    const { result } = renderHook(() => useRecoveryRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.useFakeTimers();
    let outcome: string | undefined;
    const pending = result.current.resetEmailOutcome("u1").then((value) => {
      outcome = value;
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await pending;

    expect(outcome).toBe("sent");
    expect(listUserEmails).toHaveBeenCalledTimes(3);
  });

  it("says pending only after it has really waited", async () => {
    listUserEmails.mockResolvedValue(email("pending"));
    const { result } = renderHook(() => useRecoveryRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.useFakeTimers();
    let outcome: string | undefined;
    const pending = result.current.resetEmailOutcome("u1").then((value) => {
      outcome = value;
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    await pending;

    expect(outcome).toBe("pending");
    expect(listUserEmails).toHaveBeenCalledTimes(5);
  });
});
