import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getToken, setToken } from "../client";

/**
 * The client's job is to make the backend's two error shapes and its auth
 * header one predictable thing. Both are easy to regress and neither shows up
 * in a typecheck.
 */

function respond(
  status: number,
  body: unknown,
  { ok = status < 400, contentType = "application/json" } = {}
) {
  return {
    ok,
    status,
    headers: { get: (name: string) => (name === "content-type" ? contentType : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});

describe("token storage", () => {
  it("round-trips a token and clears it", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");

    setToken(null);
    expect(getToken()).toBeNull();
  });
});

describe("apiFetch", () => {
  it("attaches the bearer token", async () => {
    setToken("abc123");
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/me");

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer abc123");
  });

  it("omits the token when the call is anonymous", async () => {
    setToken("abc123");
    const fetchMock = vi.fn().mockResolvedValue(respond(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/login", { method: "POST", body: {}, anonymous: true });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("does not set a JSON content type for multipart bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    // Setting it by hand would clobber the boundary the browser generates.
    await apiFetch("/recordings/prompt-read", { method: "POST", form: new FormData() });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("drops empty query params rather than sending blanks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/prompts", {
      query: { category: "", is_active: true, limit: 50, offset: undefined },
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("is_active=true");
    expect(url).toContain("limit=50");
    expect(url).not.toContain("category=");
    expect(url).not.toContain("offset=");
  });

  it("normalises a string `detail` into the error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond(400, { detail: "Email already registered" }))
    );

    await expect(apiFetch("/auth/register")).rejects.toMatchObject({
      status: 400,
      message: "Email already registered",
    });
  });

  it("normalises a 422 validation array into field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respond(422, {
          detail: [
            { loc: ["body", "password"], msg: "String should have at least 8 characters" },
            { loc: ["body", "email"], msg: "value is not a valid email address" },
          ],
        })
      )
    );

    const error = (await apiFetch("/auth/register").catch((e) => e)) as ApiError;

    expect(error.status).toBe(422);
    // `loc` is ["body", field] — the tail is what the form knows about.
    expect(error.fieldErrors).toEqual([
      { field: "password", message: "String should have at least 8 characters" },
      { field: "email", message: "value is not a valid email address" },
    ]);
    expect(error.message).toBe("String should have at least 8 characters");
  });

  it("falls back to a readable message when JSON is declared but unparseable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => "application/json" },
        json: () => Promise.reject(new Error("not json")),
        text: () => Promise.resolve(""),
      } as unknown as Response)
    );

    await expect(apiFetch("/auth/me")).rejects.toMatchObject({
      status: 500,
      message: "The server had a problem. Try again shortly.",
    });
  });

  it("reports an HTML 404 as unreachable, not as 'not found'", async () => {
    // What actually happens with no dev proxy: the request hits the dev server,
    // which 404s with an HTML page. Saying "Not found" sends people hunting for
    // a missing record when the real problem is a missing server.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond(404, null, { contentType: "text/html" }))
    );

    const error = (await apiFetch("/auth/login").catch((e) => e)) as ApiError;

    expect(error.isUnreachable).toBe(true);
    expect(error.message).toContain("Could not reach");
    expect(error.message).not.toContain("Not found");
  });

  it("reports a network failure as unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = (await apiFetch("/auth/me").catch((e) => e)) as ApiError;

    expect(error.status).toBe(0);
    expect(error.isUnreachable).toBe(true);
  });

  it("lets an abort through rather than reporting it as an outage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"))
    );

    // A cancelled request is a navigation, not a failure.
    await expect(apiFetch("/auth/me")).rejects.toThrow(/abort/i);
  });

  it("keeps a real JSON 404 as not-found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond(404, { detail: "Prompt not found" }))
    );

    const error = (await apiFetch("/prompts/xyz").catch((e) => e)) as ApiError;

    expect(error.isUnreachable).toBe(false);
    expect(error.message).toBe("Prompt not found");
  });

  it("flags auth failures and unavailable features distinctly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(401, null)));
    const unauthorized = (await apiFetch("/auth/me").catch((e) => e)) as ApiError;
    expect(unauthorized.message).toBe("Your session has expired. Please sign in again.");
    expect(unauthorized.isUnauthorized).toBe(true);
    expect(unauthorized.isUnavailable).toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(503, null)));
    const unavailable = (await apiFetch("/audio/transcribe").catch((e) => e)) as ApiError;
    // The optional ML stack being absent is expected, not an outage.
    expect(unavailable.isUnavailable).toBe(true);
    expect(unavailable.isUnauthorized).toBe(false);
  });

  it("tolerates an empty success body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(204, undefined)));
    await expect(apiFetch("/health")).resolves.toBeUndefined();
  });
});
