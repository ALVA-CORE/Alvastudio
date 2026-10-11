import { ApiError } from "@/lib/api/client";

/**
 * What to tell someone whose sign-in did not work.
 *
 * Every one of these is a different thing to do next, and the generic
 * messages get all but one of them wrong: an expired-session line to someone
 * who just typed their password, a permissions line to an intern who is
 * waiting on approval, an offline line to someone whose connection is fine.
 *
 * Nothing here names a status code, a header or an origin. Whoever is reading
 * it is trying to get into the product, not debug it.
 */
export function signInErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }

  /* The browser says it has no connection. The person can act on that. */
  if (error.isOffline) {
    return "You're offline. Check your connection and try again.";
  }

  /* The request never got an answer: a blocked origin, a firewall, a server
   * that is down. Indistinguishable from in here, and identical from where
   * they sit, so do not pretend to know which. */
  if (error.isUnreachable) {
    return "Can't reach Alvastudio right now. Please try again in a moment.";
  }

  /* An intern who registered but has not been approved. Not a password
   * problem, and a password reset will not help them. */
  if (error.isPendingApproval) {
    return "Your account is waiting for approval. You'll be able to sign in once an admin approves it.";
  }

  if (error.isAccountSuspended) {
    return "This account has been turned off. Ask an admin to turn it back on.";
  }

  if (error.status === 401) {
    return "Your email or password is incorrect.";
  }

  if (error.status === 429) {
    return "Too many sign-in attempts. Wait a minute and try again.";
  }

  if (error.status >= 500) {
    return "Something went wrong on our side. Please try again shortly.";
  }

  /* A 422 carries a real field message worth showing. Anything else falls
   * back to whatever the API said, which is already written for people. */
  return error.message;
}
