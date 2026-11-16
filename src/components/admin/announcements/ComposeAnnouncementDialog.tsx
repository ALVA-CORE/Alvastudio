import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { BeamInput } from "@/components/auth/BeamInput";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { AlvaMultiSelect } from "@/components/shared/AlvaMultiSelect";
import {
  EMPTY_ANNOUNCEMENT,
  formFromAnnouncement,
  formProblems,
  people,
  toAudience,
  useAudiencePreview,
  type AnnouncementField,
  type AnnouncementForm,
} from "@/hooks/useAnnouncements";
import { ANNOUNCEMENT_LIMITS, type ApiAnnouncement } from "@/lib/api/announcements";
import type { ApiUserRole } from "@/lib/api/enums";
import type { ApiIdentityStatus } from "@/lib/api/wallet";
import { ApiError } from "@/lib/api/client";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<ApiUserRole, string> = {
  contributor: "Contributors",
  intern: "Interns",
  annotator: "Annotators",
  admin: "Admins",
};

/* Keyed by the wallet's own type, so a new state there fails to compile here. */
const IDENTITY_LABELS: Record<ApiIdentityStatus, string> = {
  not_started: "Not started",
  link_created: "Started",
  submitted: "Submitted",
  passed: "Passed",
  failed: "Failed",
  unavailable: "Unavailable",
};

const APPROVAL_OPTIONS: { value: AnnouncementForm["approved"]; label: string }[] = [
  { value: "any", label: "Anyone" },
  { value: "approved", label: "Approved" },
  { value: "waiting", label: "Waiting for approval" },
];

const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

const FIELDS = new Set<string>(["title", "body", "action_label", "action_url", "expires_at"]);

type Errors = { fields: Partial<Record<AnnouncementField, string>>; form: string[] };
const NO_ERRORS: Errors = { fields: {}, form: [] };

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/**
 * Write or edit a draft. Save keeps it a draft; Send saves it, then asks.
 * A refusal other than a 422 is the caller's to report.
 */
export function ComposeAnnouncementDialog({
  open,
  onOpenChange,
  existing,
  onSubmit,
  onFailure,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The draft being edited, or null for a new one. */
  existing: ApiAnnouncement | null;
  onSubmit: (form: AnnouncementForm, send: boolean) => Promise<void>;
  onFailure: (cause: unknown) => void;
}) {
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_ANNOUNCEMENT);
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [busy, setBusy] = useState<"save" | "send" | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(existing ? formFromAnnouncement(existing) : EMPTY_ANNOUNCEMENT);
    setErrors(NO_ERRORS);
  }, [open, existing]);

  const audience = useMemo(() => toAudience(form), [form]);
  const { preview, error: previewError, isLoading: counting } = useAudiencePreview(audience, open);

  const set = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors(NO_ERRORS);
  };

  const submit = async (send: boolean) => {
    const problems = formProblems(form);
    if (Object.keys(problems).length) {
      setErrors({ fields: problems, form: [] });
      return;
    }
    setBusy(send ? "send" : "save");
    try {
      await onSubmit(form, send);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        const next: Errors = { fields: {}, form: [] };
        for (const item of cause.fieldErrors) {
          if (FIELDS.has(item.field)) next.fields[item.field as AnnouncementField] = item.message;
          else next.form.push(item.message);
        }
        if (cause.fieldErrors.length === 0) next.form.push(cause.message);
        setErrors(next);
      } else {
        onFailure(cause);
      }
    } finally {
      setBusy(null);
    }
  };

  const { fields } = errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "flex max-h-[88vh] max-w-lg flex-col gap-0 overflow-hidden border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl text-foreground">
            {existing ? "Edit draft" : "New announcement"}
          </DialogTitle>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <BeamInput
              label="Title"
              value={form.title}
              maxLength={ANNOUNCEMENT_LIMITS.title}
              aria-invalid={Boolean(fields.title) || undefined}
              onChange={(event) => set("title", event.target.value)}
            />
            <FieldError message={fields.title} />
          </div>

          <div>
            <FieldBeam>
              <textarea
                aria-label="Message"
                placeholder="Message"
                rows={5}
                value={form.body}
                maxLength={ANNOUNCEMENT_LIMITS.body}
                onChange={(event) => set("body", event.target.value)}
                className={cn(
                  alvaFieldClass(Boolean(fields.body)),
                  "block h-auto w-full resize-none px-3 py-2.5 text-sm leading-relaxed focus-visible:border-transparent"
                )}
              />
            </FieldBeam>
            <FieldError message={fields.body} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AlvaMultiSelect
              label="Roles"
              value={form.roles}
              onChange={(next) => set("roles", next as ApiUserRole[])}
              options={options(ROLE_LABELS)}
              summary={(picked) => picked.map((role) => ROLE_LABELS[role as ApiUserRole]).join(", ")}
            />
            <AlvaSelect
              label="Approval"
              value={form.approved}
              onValueChange={(next) => set("approved", next as AnnouncementForm["approved"])}
              options={APPROVAL_OPTIONS}
            />
            <AlvaMultiSelect
              label="Identity check"
              className="sm:col-span-2"
              value={form.identityStatus}
              onChange={(next) => set("identityStatus", next as ApiIdentityStatus[])}
              options={options(IDENTITY_LABELS)}
              summary={(picked) =>
                picked.map((status) => IDENTITY_LABELS[status as ApiIdentityStatus]).join(", ")
              }
            />
          </div>

          <FieldBeam>
            <textarea
              aria-label="Emails"
              placeholder="Emails, one per line"
              rows={3}
              value={form.emails}
              onChange={(event) => set("emails", event.target.value)}
              className={cn(
                alvaFieldClass(),
                "block h-auto w-full resize-none px-3 py-2.5 text-sm leading-relaxed focus-visible:border-transparent"
              )}
            />
          </FieldBeam>

          <div aria-live="polite" className="space-y-1 text-sm">
            {previewError ? (
              <p className="text-destructive">{previewError}</p>
            ) : preview ? (
              <p className={cn("text-foreground", counting && "opacity-60")}>
                This reaches {people(preview.recipient_count)}.
              </p>
            ) : (
              <p className="text-muted-foreground">Counting…</p>
            )}
            {preview && preview.unmatched_emails.length > 0 ? (
              <p className="break-words text-xs text-amber-300">
                No account: {preview.unmatched_emails.join(", ")}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-[2fr_3fr] gap-2">
            <div className="min-w-0">
              <BeamInput
                label="Button"
                value={form.actionLabel}
                maxLength={ANNOUNCEMENT_LIMITS.actionLabel}
                aria-invalid={Boolean(fields.action_label) || undefined}
                onChange={(event) => set("actionLabel", event.target.value)}
              />
              <FieldError message={fields.action_label} />
            </div>
            <div className="min-w-0">
              <BeamInput
                label="Link"
                inputMode="url"
                value={form.actionUrl}
                maxLength={ANNOUNCEMENT_LIMITS.actionUrl}
                aria-invalid={Boolean(fields.action_url) || undefined}
                onChange={(event) => set("actionUrl", event.target.value)}
              />
              <FieldError message={fields.action_url} />
            </div>
          </div>

          <div>
            <BeamInput
              label="Expires"
              type="datetime-local"
              labelLifted
              value={form.expiresAt}
              aria-invalid={Boolean(fields.expires_at) || undefined}
              onChange={(event) => set("expiresAt", event.target.value)}
            />
            <FieldError message={fields.expires_at} />
          </div>

          {errors.form.length > 0 ? (
            <div role="alert" className="space-y-1 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400">
              {errors.form.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-alva-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Cancel
          </button>
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            loading={busy === "save"}
            disabled={busy !== null}
            onClick={() => void submit(false)}
          >
            Save draft
          </TextureButton>
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            loading={busy === "send"}
            disabled={busy !== null}
            onClick={() => void submit(true)}
          >
            Send
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
