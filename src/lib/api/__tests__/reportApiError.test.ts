import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../client";
import { reportApiError, __resetApiErrorReporter } from "../reportApiError";
import { alvaToast } from "@/lib/alva-toast";

function unreachable(message = "You're offline.") {
  const error = new ApiError(0, message);
  error.unreachable = true;
  return error;
}

describe("reportApiError", () => {
  beforeEach(() => {
    __resetApiErrorReporter();
    vi.restoreAllMocks();
  });

  /* A dropped connection is about the device, not the card on screen. Pinning
   * it inline implies that one card is broken and leaves a red box behind
   * after the network recovers. */
  it("sends a connection failure to the toast and nothing inline", () => {
    const toast = vi.spyOn(alvaToast, "error").mockReturnValue("" as never);

    expect(reportApiError(unreachable())).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  /* One page can fire a dozen requests. Twelve identical toasts is worse than
   * the banner it replaced. */
  it("does not stack toasts for a burst of failures", () => {
    const toast = vi.spyOn(alvaToast, "error").mockReturnValue("" as never);

    reportApiError(unreachable());
    reportApiError(unreachable());
    reportApiError(unreachable());

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("keeps a real API error inline, where the retry is", () => {
    const toast = vi.spyOn(alvaToast, "error").mockReturnValue("" as never);

    expect(reportApiError(new ApiError(404, "No unread prompts available"))).toBe(
      "No unread prompts available"
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it("falls back for something that is not an ApiError", () => {
    expect(reportApiError(new TypeError("boom"), "Could not load.")).toBe(
      "Could not load."
    );
  });
});
