import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { setToken } from "@/lib/api/client";
import { AuthProvider, useAuth } from "@/lib/auth/context";
import { PushNotificationsRow } from "../PushNotificationsRow";

/* A browser that can take pushes, in a production build. */
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";
const SUBSCRIPTION_JSON = {
  endpoint: ENDPOINT,
  expirationTime: null,
  keys: { p256dh: "BNc", auth: "tBH" },
};

let permission: NotificationPermission;
type FakeSubscription = { endpoint: string; toJSON: () => unknown; unsubscribe: () => Promise<boolean> };
let current: FakeSubscription | null;
let subscribeMock: Mock<(options: PushSubscriptionOptionsInit) => Promise<FakeSubscription>>;
let unsubscribeMock: Mock<() => Promise<boolean>>;
let fetchMock: Mock<(url: string, init: RequestInit) => Promise<Response>>;

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Answers by route, and records what was sent. */
function api(routes: Record<string, (init: RequestInit) => Response>) {
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname.replace(/^.*\/api\/v1/, "");
    const route = routes[`${init.method} ${path}`];
    return route ? route(init) : json(404, { detail: "Not found" });
  });
  vi.stubGlobal("fetch", fetchMock);
}

const sent = (method: string, path: string) =>
  fetchMock.mock.calls.filter(
    ([url, init]) => init.method === method && String(url).endsWith(path)
  );

function makeSubscription(): FakeSubscription {
  return { endpoint: ENDPOINT, toJSON: () => SUBSCRIPTION_JSON, unsubscribe: unsubscribeMock };
}

beforeEach(() => {
  vi.stubEnv("PROD", true);
  permission = "default";
  current = null;
  unsubscribeMock = vi.fn(async () => {
    current = null;
    return true;
  });
  subscribeMock = vi.fn(async () => {
    current = makeSubscription();
    return current;
  });
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", {
    get permission() {
      return permission;
    },
    requestPermission: vi.fn(async () => {
      permission = "granted";
      return permission;
    }),
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({
        pushManager: { getSubscription: async () => current, subscribe: subscribeMock },
      }),
    },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  setToken(null);
  localStorage.clear();
});

describe("PushNotificationsRow", () => {
  it("is not there without PushManager, as in an iPhone's Safari tab", () => {
    vi.stubGlobal("PushManager", undefined);
    delete (window as { PushManager?: unknown }).PushManager;
    const { container } = render(<PushNotificationsRow />);
    expect(container).toBeEmptyDOMElement();
  });

  it("asks from the tap, subscribes with the server's key and saves toJSON()", async () => {
    /* "-_8" is base64url for 0xFB 0xFF: both alphabet swaps in one key. */
    api({
      "GET /push/public-key": () => json(200, { public_key: "-_8" }),
      "POST /push/subscriptions": () => json(201, { id: "1", created_at: "2026-11-16T00:00:00Z" }),
    });
    render(<PushNotificationsRow />);

    await userEvent.click(screen.getByRole("button", { name: /Push notifications/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Turn on" }));

    await screen.findByRole("button", { name: "Turn off" });
    expect(Notification.requestPermission).toHaveBeenCalledTimes(1);
    const options = subscribeMock.mock.calls[0][0];
    expect(options.userVisibleOnly).toBe(true);
    expect(Array.from(options.applicationServerKey as Uint8Array)).toEqual([0xfb, 0xff]);
    const [, init] = sent("POST", "/push/subscriptions")[0];
    expect(JSON.parse(init.body as string)).toEqual(SUBSCRIPTION_JSON);
  });

  it("says push is off when the server has no key", async () => {
    api({ "GET /push/public-key": () => json(503, { detail: "Push is not set up." }) });
    render(<PushNotificationsRow />);

    await userEvent.click(screen.getByRole("button", { name: /Push notifications/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Turn on" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Push notifications are not available right now."
    );
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("says so plainly when notifications are blocked", async () => {
    permission = "denied";
    render(<PushNotificationsRow />);

    await userEvent.click(screen.getByRole("button", { name: /Push notifications/ }));
    expect(await screen.findByText("Notifications are blocked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn on" })).not.toBeInTheDocument();
  });

  it("turning off forgets the endpoint and unsubscribes", async () => {
    permission = "granted";
    current = makeSubscription();
    api({ "DELETE /push/subscriptions": () => json(204) });
    render(<PushNotificationsRow />);

    await userEvent.click(await screen.findByRole("button", { name: /Push notifications\s*On/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Turn off" }));

    await screen.findByRole("button", { name: "Turn on" });
    const [, init] = sent("DELETE", "/push/subscriptions")[0];
    expect(JSON.parse(init.body as string)).toEqual({ endpoint: ENDPOINT });
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("shows the API's message when the test is refused", async () => {
    permission = "granted";
    current = makeSubscription();
    api({ "POST /push/test": () => json(429, { detail: "Five tests an hour. Try again later." }) });
    render(<PushNotificationsRow />);

    await userEvent.click(await screen.findByRole("button", { name: /Push notifications\s*On/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Send a test" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Five tests an hour. Try again later.");
  });
});

describe("signing out", () => {
  function SignOut() {
    const { user, logout } = useAuth();
    return user ? <button onClick={logout}>Sign out</button> : <p>Signed out</p>;
  }

  it("forgets this browser's subscription with the token still on it", async () => {
    permission = "granted";
    current = makeSubscription();
    setToken("tok");
    api({
      "GET /auth/me": () =>
        json(200, { id: "u1", email: "a@b.c", full_name: "Ada", phone: null, role: "intern", is_active: true, created_at: "" }),
      "POST /push/subscriptions": () => json(201, { id: "1", created_at: "" }),
      "DELETE /push/subscriptions": () => json(204),
      "POST /auth/logout": () => json(204),
    });
    render(
      <AuthProvider>
        <SignOut />
      </AuthProvider>
    );

    /* The quiet re-save on start, which also learns the endpoint. */
    await waitFor(() => expect(sent("POST", "/push/subscriptions")).toHaveLength(1));
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await screen.findByText("Signed out");
    const [, init] = sent("DELETE", "/push/subscriptions")[0];
    expect(JSON.parse(init.body as string)).toEqual({ endpoint: ENDPOINT });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
  });
});
