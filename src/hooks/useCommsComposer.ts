import { useCallback, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import {
  createCommunication,
  previewCommunication,
  sendCommunication,
  updateCommunication,
  type ApiCommunicationAudience,
  type ApiCommunicationDetail,
  type ApiCommunicationDraft,
} from "@/lib/api/communications";
import {
  actionUrlProblem,
  DEFAULT_ACTION_LABEL,
  DEFAULT_ACTION_URL,
} from "@/lib/admin/emailTemplate";
import { ApiError } from "@/lib/api/client";

export type ComposerFields = {
  /** A data URL. Preview only until the API takes a hero (endpoints-needed #7). */
  hero: string | null;
  header: string;
  /** The editor's document, formatting and all. */
  bodyDoc: JSONContent | null;
  /** That document as plain text: what the API is sent (endpoints-needed #6). */
  body: string;
  button: string;
  link: string;
  audience: ApiCommunicationAudience;
  selected: string[];
};

/* The button starts as the default one, written out, so the field always
   shows where it goes. Left as it is, nothing custom is sent. */
const EMPTY: ComposerFields = {
  hero: null,
  header: "",
  bodyDoc: null,
  body: "",
  button: DEFAULT_ACTION_LABEL,
  link: DEFAULT_ACTION_URL,
  audience: "all_contributors",
  selected: [],
};

/** Where the send is: writing, waiting for the second press, or going. */
export type SendStage =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "confirm"; id: string; revision: number; count: number; blocked: string | null }
  | { kind: "sending"; id: string; revision: number; count: number };

/**
 * The email being written, and the two-press send.
 *
 * Held above the panel, in the admin shell, so closing it or moving to
 * another page keeps a half-written email.
 *
 * The first press saves the draft (created once, patched after) and asks the
 * server who it goes to. The second sends against the revision that answered.
 * A send is never retried by making a new draft: a lost response is followed
 * by `onUncertain`, which asks the server what it has.
 */
export function useCommsComposer() {
  const [fields, setFields] = useState<ComposerFields>(EMPTY);
  const [draft, setDraft] = useState<ApiCommunicationDetail | null>(null);
  const [stage, setStage] = useState<SendStage>({ kind: "idle" });

  const set = useCallback(<K extends keyof ComposerFields>(key: K, value: ComposerFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    /* Any edit after the first press means the count and the revision it
       showed are no longer what would be sent. */
    setStage((prev) => (prev.kind === "confirm" ? { kind: "idle" } : prev));
  }, []);

  const valid = useMemo(() => {
    if (!fields.header.trim() || !fields.body.trim()) return false;
    const link = fields.link.trim();
    if (link && actionUrlProblem(link)) return false;
    if (fields.audience === "selected_contributors" && fields.selected.length === 0) return false;
    return true;
  }, [fields]);

  const toDraft = (forPatch: boolean): ApiCommunicationDraft => {
    const chosen = fields.audience === "selected_contributors";
    /* The API takes both or neither. Either one set means a custom button,
       with the default standing in for whichever was left empty: new words
       on the studio link, or the usual words on a new link. */
    const button = fields.button.trim();
    const link = fields.link.trim();
    const custom =
      (button !== "" && button !== DEFAULT_ACTION_LABEL) ||
      (link !== "" && link !== DEFAULT_ACTION_URL);
    return {
      subject: fields.header.trim(),
      body: fields.body.trim(),
      audience: fields.audience,
      ...(chosen ? { recipient_ids: fields.selected } : forPatch ? { recipient_ids: [] } : {}),
      ...(custom
        ? {
            action_label: button || DEFAULT_ACTION_LABEL,
            action_url: link || DEFAULT_ACTION_URL,
          }
        : forPatch
          ? { action_label: null, action_url: null }
          : {}),
    };
  };

  /** First press: save, then ask the server who it goes to. */
  const prepare = async () => {
    setStage({ kind: "checking" });
    try {
      const saved = draft
        ? await updateCommunication(draft.id, draft.revision, toDraft(true))
        : await createCommunication(toDraft(false));
      setDraft(saved);
      const preview = await previewCommunication(saved.id);
      const blocked = !preview.email_available
        ? "Email is unavailable on the server."
        : preview.unavailable_recipient_count > 0
          ? `${preview.unavailable_recipient_count} chosen can no longer be reached.`
          : preview.recipient_count === 0
            ? "Nobody to send to."
            : null;
      setStage({
        kind: "confirm",
        id: saved.id,
        revision: preview.revision,
        count: preview.recipient_count,
        blocked,
      });
      return blocked;
    } catch (cause) {
      setStage({ kind: "idle" });
      /* Somebody else's change, or a send, landed on this draft first. Start
         a fresh one next time rather than fight over this one. */
      if (cause instanceof ApiError && cause.status === 409) setDraft(null);
      throw cause;
    }
  };

  /** Second press. Resolves with the queued email. */
  const send = async () => {
    if (stage.kind !== "confirm" || stage.blocked) return null;
    const { id, revision, count } = stage;
    setStage({ kind: "sending", id, revision, count });
    try {
      const queued = await sendCommunication(id, revision);
      setFields(EMPTY);
      setDraft(null);
      setStage({ kind: "idle" });
      return queued;
    } catch (cause) {
      setStage({ kind: "idle" });
      if (cause instanceof ApiError && cause.status === 409) setDraft(null);
      throw cause;
    }
  };

  const cancel = () => setStage({ kind: "idle" });

  const reset = () => {
    setFields(EMPTY);
    setDraft(null);
    setStage({ kind: "idle" });
  };

  return { fields, set, valid, stage, prepare, send, cancel, reset };
}
