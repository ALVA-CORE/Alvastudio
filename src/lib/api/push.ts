import { apiFetch } from "./client";

/**
 * Web Push (ask #19, 16 Nov). Every route needs a signed-in person, any role.
 */

/** `PushSubscriptionIn`: `PushSubscription.toJSON()` exactly as the browser gives it. */
export type ApiPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
};

/** `GET /push/public-key`: the VAPID key to subscribe with. 503 when push is off on the server. */
export async function getPushPublicKey(): Promise<string> {
  const { public_key } = await apiFetch<{ public_key: string }>("/push/public-key");
  return public_key;
}

/** `POST /push/subscriptions`. Safe to repeat; a shared phone moves to whoever sends it. */
export function savePushSubscription(subscription: ApiPushSubscription) {
  return apiFetch<{ id: string; created_at: string }>("/push/subscriptions", {
    method: "POST",
    body: subscription,
  });
}

/** `DELETE /push/subscriptions`. 204 every time; only the caller's own is forgotten. */
export function forgetPushSubscription(endpoint: string) {
  return apiFetch<void>("/push/subscriptions", { method: "DELETE", body: { endpoint } });
}

/** `POST /push/test`: five an hour, then 429 with `Retry-After`. */
export function sendTestPush() {
  return apiFetch<{ devices: number; sent: number }>("/push/test", { method: "POST" });
}
