import { useCallback, useEffect, useState } from "react";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  previewAudience,
  sendAnnouncement,
  updateAnnouncement,
  withdrawAnnouncement,
  type ApiAnnouncement,
  type ApiAnnouncementAudience,
  type ApiAnnouncementIn,
  type ApiAnnouncementPatch,
  type ApiAudiencePreview,
} from "@/lib/api/announcements";
import type { ApiUserRole } from "@/lib/api/enums";
import type { ApiIdentityStatus } from "@/lib/api/wallet";
import { actionUrlProblem } from "@/lib/admin/emailTemplate";
import { reportApiError } from "@/lib/api/reportApiError";

export type AnnouncementForm = {
  title: string;
  body: string;
  roles: ApiUserRole[];
  approved: "any" | "approved" | "waiting";
  identityStatus: ApiIdentityStatus[];
  /** As typed: addresses split by spaces, commas or new lines. */
  emails: string;
  /** Not editable here, but kept so saving a draft never drops them. */
  userIds: string[];
  actionLabel: string;
  actionUrl: string;
  /** A `datetime-local` value, or blank for never. */
  expiresAt: string;
};

export const EMPTY_ANNOUNCEMENT: AnnouncementForm = {
  title: "",
  body: "",
  roles: [],
  approved: "any",
  identityStatus: [],
  emails: "",
  userIds: [],
  actionLabel: "",
  actionUrl: "",
  expiresAt: "",
};

/** "1 person", "42 people". */
export const people = (count: number) =>
  `${count.toLocaleString()} ${count === 1 ? "person" : "people"}`;

export function parseEmails(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

const pad = (value: number) => String(value).padStart(2, "0");

/** An ISO time as the local `datetime-local` value. */
export function toLocalInput(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formFromAnnouncement(row: ApiAnnouncement): AnnouncementForm {
  const { audience } = row;
  return {
    title: row.title,
    body: row.body,
    roles: audience.roles ?? [],
    approved: audience.approved == null ? "any" : audience.approved ? "approved" : "waiting",
    identityStatus: audience.identity_status ?? [],
    emails: (audience.emails ?? []).join("\n"),
    userIds: audience.user_ids ?? [],
    actionLabel: row.action_label ?? "",
    actionUrl: row.action_url ?? "",
    expiresAt: row.expires_at ? toLocalInput(row.expires_at) : "",
  };
}

/**
 * The audience as the API takes it. A field with nothing in it is left out:
 * an empty list is a 422. Sorted, so the same choice always compares equal.
 */
export function toAudience(form: AnnouncementForm): ApiAnnouncementAudience {
  const audience: ApiAnnouncementAudience = {};
  if (form.roles.length) audience.roles = [...form.roles].sort();
  if (form.approved !== "any") audience.approved = form.approved === "approved";
  if (form.identityStatus.length) audience.identity_status = [...form.identityStatus].sort();
  const emails = parseEmails(form.emails);
  if (emails.length) audience.emails = emails.sort();
  if (form.userIds.length) audience.user_ids = [...form.userIds].sort();
  return audience;
}

const cleanBody = (body: string) => body.replace(/\r\n/g, "\n").trim();
const expiresIso = (local: string) => (local ? new Date(local).toISOString() : null);
const hasAction = (form: AnnouncementForm) => Boolean(form.actionLabel.trim() && form.actionUrl.trim());

export function toCreate(form: AnnouncementForm): ApiAnnouncementIn {
  const audience = toAudience(form);
  const expires = expiresIso(form.expiresAt);
  return {
    title: form.title.trim(),
    body: cleanBody(form.body),
    /* Left out is everybody. */
    ...(Object.keys(audience).length ? { audience } : {}),
    ...(hasAction(form)
      ? { action_label: form.actionLabel.trim(), action_url: form.actionUrl.trim() }
      : {}),
    ...(expires ? { expires_at: expires } : {}),
  };
}

/** Only what changed since `before`. Empty when nothing did. */
export function toPatch(form: AnnouncementForm, before: AnnouncementForm): ApiAnnouncementPatch {
  const patch: ApiAnnouncementPatch = {};
  if (form.title.trim() !== before.title.trim()) patch.title = form.title.trim();
  if (cleanBody(form.body) !== cleanBody(before.body)) patch.body = cleanBody(form.body);
  const audience = toAudience(form);
  if (JSON.stringify(audience) !== JSON.stringify(toAudience(before))) patch.audience = audience;
  const action = hasAction(form);
  if (
    action !== hasAction(before) ||
    form.actionLabel.trim() !== before.actionLabel.trim() ||
    form.actionUrl.trim() !== before.actionUrl.trim()
  ) {
    /* The pair goes together, set or cleared. */
    patch.action_label = action ? form.actionLabel.trim() : null;
    patch.action_url = action ? form.actionUrl.trim() : null;
  }
  if (form.expiresAt !== before.expiresAt) patch.expires_at = expiresIso(form.expiresAt);
  return patch;
}

export type AnnouncementField = "title" | "body" | "action_label" | "action_url" | "expires_at";

/** The API's rules, checked before a 422 says the same. */
export function formProblems(form: AnnouncementForm): Partial<Record<AnnouncementField, string>> {
  const problems: Partial<Record<AnnouncementField, string>> = {};
  if (!form.title.trim()) problems.title = "Write a title.";
  if (!cleanBody(form.body)) problems.body = "Write a message.";
  const label = form.actionLabel.trim();
  const url = form.actionUrl.trim();
  if (Boolean(label) !== Boolean(url)) {
    problems[label ? "action_url" : "action_label"] = "Add both the button and the link, or neither.";
  } else if (url) {
    const inStudio = url.startsWith("/") && !url.startsWith("//");
    const problem = inStudio
      ? /\s/.test(url)
        ? "A link cannot contain spaces."
        : null
      : actionUrlProblem(url);
    if (problem) problems.action_url = problem;
  }
  if (form.expiresAt && new Date(form.expiresAt).getTime() <= Date.now()) {
    problems.expires_at = "Pick a time in the future.";
  }
  return problems;
}

/**
 * How many people an audience reaches, asked 400 ms after it stops changing.
 * Only the latest answer lands.
 */
export function useAudiencePreview(audience: ApiAnnouncementAudience, enabled: boolean) {
  const key = JSON.stringify(audience);
  const [preview, setPreview] = useState<ApiAudiencePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      previewAudience(JSON.parse(key) as ApiAnnouncementAudience, controller.signal)
        .then((answer) => {
          if (controller.signal.aborted) return;
          setPreview(answer);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setPreview(null);
          setError(reportApiError(cause, "Could not count the people."));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, enabled]);

  return { preview, error, isLoading };
}

/**
 * One page of drafts or of sent announcements, and every write. Each write
 * reloads the page, failed or not: a 404 or 409 means the list is stale.
 */
export function useAnnouncements(view: { status: "draft" | "sent"; page: number; pageSize: number }) {
  const { status, page, pageSize } = view;
  const [rows, setRows] = useState<ApiAnnouncement[]>([]);
  const [total, setTotal] = useState(0);
  /* The page skeleton until the first answer; after that only the table waits. */
  const [isLoading, setLoading] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    listAnnouncements({ status, limit: pageSize, offset: (page - 1) * pageSize })
      .then((answer) => {
        if (cancelled) return;
        setRows(answer.items);
        setTotal(answer.total);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load announcements."));
      })
      .finally(() => {
        if (cancelled) return;
        setFetching(false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, pageSize, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const write = useCallback(
    async <T,>(call: () => Promise<T>) => {
      try {
        return await call();
      } finally {
        reload();
      }
    },
    [reload]
  );

  return {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    reload,
    /** Creates a draft, or patches only what changed. Resolves with the saved row. */
    save: (form: AnnouncementForm, existing: ApiAnnouncement | null) =>
      write(async () => {
        if (!existing) return createAnnouncement(toCreate(form));
        const patch = toPatch(form, formFromAnnouncement(existing));
        return Object.keys(patch).length ? updateAnnouncement(existing.id, patch) : existing;
      }),
    send: (id: string) => write(() => sendAnnouncement(id)),
    withdraw: (id: string) => write(() => withdrawAnnouncement(id)),
    remove: (id: string) => write(() => deleteAnnouncement(id)),
  };
}
