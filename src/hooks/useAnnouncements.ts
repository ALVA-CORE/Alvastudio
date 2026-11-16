import { useCallback, useEffect, useState } from "react";
import {
  createAnnouncement,
  listAnnouncements,
  sendAnnouncement,
  updateAnnouncement,
  withdrawAnnouncement,
  type ApiAnnouncement,
  type ApiAnnouncementAudience,
  type ApiAnnouncementIn,
} from "@/lib/api/announcements";
import type { ApiUserRole } from "@/lib/api/enums";
import { ApiError } from "@/lib/api/client";
import { actionUrlProblem } from "@/lib/admin/emailTemplate";

/**
 * An in-app announcement, written in the message panel bottom right beside
 * email (15 Nov handoff). It works as email does: Send saves it and shows
 * how many it reaches, a second press sends it.
 */

export type AnnouncementForm = {
  title: string;
  body: string;
  /** None is everybody. */
  roles: ApiUserRole[];
  approved: "any" | "approved" | "waiting";
  actionLabel: string;
  actionUrl: string;
};

export const EMPTY_ANNOUNCEMENT: AnnouncementForm = {
  title: "",
  body: "",
  roles: [],
  approved: "any",
  actionLabel: "",
  actionUrl: "",
};

/** A field with nothing chosen is left out: an empty list is a 422. */
export function toAudience(form: AnnouncementForm): ApiAnnouncementAudience {
  const audience: ApiAnnouncementAudience = {};
  if (form.roles.length) audience.roles = [...form.roles].sort();
  if (form.approved !== "any") audience.approved = form.approved === "approved";
  return audience;
}

const cleanBody = (body: string) => body.replace(/\r\n/g, "\n").trim();

/**
 * The whole announcement, for a new draft and for changing one: `audience`
 * replaces the old one, and the button and link are set or cleared together.
 */
export function toBody(form: AnnouncementForm): ApiAnnouncementIn {
  const action = Boolean(form.actionLabel.trim() && form.actionUrl.trim());
  return {
    title: form.title.trim(),
    body: cleanBody(form.body),
    audience: toAudience(form),
    action_label: action ? form.actionLabel.trim() : null,
    action_url: action ? form.actionUrl.trim() : null,
  };
}

/** The API's rules, checked before a 422 says the same. */
export function formProblem(form: AnnouncementForm): string | null {
  if (!form.title.trim() || !cleanBody(form.body)) return "Write a title and a message.";
  const label = form.actionLabel.trim();
  const url = form.actionUrl.trim();
  if (Boolean(label) !== Boolean(url)) return "Add both the button and the link, or neither.";
  if (!url) return null;
  /* A studio path, or an https link. */
  if (url.startsWith("/") && !url.startsWith("//")) {
    return /\s/.test(url) ? "A link cannot contain spaces." : null;
  }
  return actionUrlProblem(url);
}

type Stage =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "confirm"; count: number }
  | { kind: "sending" };

export function useAnnouncementComposer() {
  const [fields, setFields] = useState<AnnouncementForm>(EMPTY_ANNOUNCEMENT);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  /* The draft the first press saved; the next press changes that one. */
  const [draftId, setDraftId] = useState<string | null>(null);

  const set = useCallback(<K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    /* A change after the count was shown needs counting again. */
    setStage((prev) => (prev.kind === "confirm" ? { kind: "idle" } : prev));
  }, []);

  /* A draft deleted or sent elsewhere: start a new one next time. */
  const forgetIfGone = (cause: unknown) => {
    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 409)) setDraftId(null);
  };

  /** Saves the draft and shows who it reaches. */
  const prepare = async () => {
    setStage({ kind: "saving" });
    try {
      const saved = draftId
        ? await updateAnnouncement(draftId, toBody(fields))
        : await createAnnouncement(toBody(fields));
      setDraftId(saved.id);
      setStage({ kind: "confirm", count: saved.recipient_count });
    } catch (cause) {
      forgetIfGone(cause);
      setStage({ kind: "idle" });
      throw cause;
    }
  };

  /** Sends the saved draft. Resolves with it, now sent. */
  const send = async () => {
    if (!draftId) return null;
    setStage({ kind: "sending" });
    try {
      const sent = await sendAnnouncement(draftId);
      setFields(EMPTY_ANNOUNCEMENT);
      setDraftId(null);
      setStage({ kind: "idle" });
      return sent;
    } catch (cause) {
      forgetIfGone(cause);
      setStage({ kind: "idle" });
      throw cause;
    }
  };

  return {
    fields,
    set,
    stage,
    problem: formProblem(fields),
    prepare,
    send,
    cancel: () => setStage({ kind: "idle" }),
  };
}

/** What has been sent, newest first, and withdrawing one. */
export function useSentAnnouncements(version: number) {
  const [rows, setRows] = useState<ApiAnnouncement[] | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAnnouncements({ status: "sent", limit: 50 })
      .then((page) => {
        if (!cancelled) setRows(page.items);
      })
      .catch(() => {
        if (!cancelled) setRows((prev) => prev ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [version, attempt]);

  const withdraw = useCallback(async (id: string) => {
    try {
      return await withdrawAnnouncement(id);
    } finally {
      setAttempt((value) => value + 1);
    }
  }, []);

  return { rows, withdraw };
}
