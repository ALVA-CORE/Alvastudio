import { useEffect, useMemo, useState } from "react";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Restart from "@solar-icons/react/arrows/Restart";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { ActivityReplay } from "@/components/admin/shared/ActivityReplay";
import {
  AuditTimeline,
  DetailField,
  DetailGroup,
  DetailPanel,
  DetailProse,
  PanelAction,
} from "@/components/admin/shared/detail";
import {
  ANNOTATION_STATUS_LABELS,
  annotationAudit,
  type AdminAnnotation,
  type AnnotationStatus,
} from "@/data/admin/oversight";
import { fromApiEvents, type ActivityEvent } from "@/data/admin/activity";
import { listEvents } from "@/lib/api/annotationEvents";
import { getAnnotation } from "@/lib/api/annotations";
import { round1 } from "@/data/admin/shared";

const STATUS_TONE: Record<AnnotationStatus, PillTone> = {
  approved: "good",
  submitted: "pending",
  in_progress: "pending",
  draft: "neutral",
  needs_rework: "bad",
  rejected: "bad",
};

const TABS = [
  { id: "detail", label: "Annotation" },
  { id: "activity", label: "Activity" },
  { id: "audit", label: "History" },
];

/**
 * One annotation, and the two verdicts an admin can give it.
 *
 * Approve and Send back are the reason this panel exists — the table could
 * always show status, but changing it meant opening the annotator's own
 * workspace. Sending back asks for no reason field on purpose: a one-line
 * reason typed into a modal is never as useful as the conversation that
 * follows, and pretending otherwise just adds a step.
 */
export function AnnotationDetailPanel({
  open,
  onOpenChange,
  annotation,
  onApprove,
  onSendBack,
  onReassign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotation: AdminAnnotation | null;
  onApprove: (annotation: AdminAnnotation) => void;
  onSendBack: (annotation: AdminAnnotation) => void;
  onReassign: (annotation: AdminAnnotation) => void;
}) {
  const [tab, setTab] = useState("detail");
  const [confirm, setConfirm] = useState<"approve" | "rework" | null>(null);

  /**
   * Segment and tag counts, fetched when the panel opens.
   *
   * `GET /annotations` returns ids and status and nothing else, so the table
   * does not claim to know these. The full document does carry them, and one
   * request for the row somebody is actually reading is a fair trade; one per
   * row to fill a column was not.
   */
  const [counts, setCounts] = useState<{ segments: number; tags: number } | null>(
    null
  );

  useEffect(() => {
    if (!open || !annotation) return;

    let cancelled = false;
    setCounts(null);

    getAnnotation(annotation.id)
      .then((document) => {
        if (cancelled) return;
        setCounts({
          segments: document.segments?.length ?? 0,
          /* "Tags" is every mark an annotator put on a segment, not one
           * field: a language span, a disfluency, an untranscribable stretch
           * and a non-speech event are all tags in the workspace. */
          tags: (document.segments ?? []).reduce(
            (total, segment) =>
              total +
              segment.language_spans.length +
              segment.disfluencies.length +
              segment.untranscribable_spans.length +
              segment.non_speech_events.length,
            0
          ),
        });
      })
      .catch(() => setCounts(null));

    return () => {
      cancelled = true;
    };
  }, [open, annotation]);

  const audit = useMemo(
    () => (annotation ? annotationAudit(annotation) : []),
    [annotation]
  );

  /**
   * Every move the annotator made, in order.
   *
   * Read when the panel opens rather than with the list: it is up to 500
   * events for one row, and nobody opens twenty of these at once.
   *
   * An empty log is not a failure. Nothing is recorded until the annotator
   * agrees to it, so a blank replay usually means they have not — which the
   * replay says rather than implying the work never happened.
   */
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!open || !annotation) return;

    let cancelled = false;
    setActivity([]);

    listEvents(annotation.id, { limit: 500 })
      .then((page) => {
        if (cancelled) return;
        setActivity(fromApiEvents(page.items));
      })
      .catch(() => setActivity([]));

    return () => {
      cancelled = true;
    };
  }, [open, annotation]);

  if (!annotation) return null;

  const awaitingVerdict =
    annotation.status === "submitted" || annotation.status === "approved";

  return (
    <>
      <DetailPanel
        open={open}
        onOpenChange={(next) => {
          if (!next) setTab("detail");
          onOpenChange(next);
        }}
        title={`Annotation ${annotation.code}`}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        header={
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
              <DocumentText size={26} weight="BoldDuotone" className="text-alva-accent" />
            </span>
            <p className="mt-4 text-xl font-semibold tabular-nums text-foreground">
              {annotation.code}
            </p>
            <div className="mt-2">
              <AdminStatusPill tone={STATUS_TONE[annotation.status]}>
                {ANNOTATION_STATUS_LABELS[annotation.status]}
              </AdminStatusPill>
            </div>
          </div>
        }
        footer={
          <>
            <PanelAction
              icon={<UsersGroupRounded size={15} weight="Outline" />}
              label="Reassign"
              onClick={() => {
                onReassign(annotation);
                onOpenChange(false);
              }}
            />
            {annotation.status === "submitted" ? (
              <>
                <PanelAction
                  icon={<Restart size={15} weight="Outline" />}
                  label="Send back"
                  tone="danger"
                  onClick={() => setConfirm("rework")}
                />
                <PanelAction
                  icon={<CheckCircle size={15} weight="Outline" />}
                  label="Approve"
                  tone="primary"
                  onClick={() => setConfirm("approve")}
                />
              </>
            ) : awaitingVerdict ? (
              <PanelAction
                icon={<Restart size={15} weight="Outline" />}
                label="Send back"
                tone="danger"
                onClick={() => setConfirm("rework")}
              />
            ) : null}
          </>
        }
      >
        {tab === "detail" ? (
          <>
            <DetailGroup title="Session" first>
              <DetailProse label="Topic">{annotation.topic}</DetailProse>
              <DetailField label="Annotator" value={annotation.annotator} />
              <DetailField label="Length" value={annotation.duration} />
              <DetailField label="Claimed" value={annotation.claimedLabel} />
              <DetailField
                label="Status"
                value={ANNOTATION_STATUS_LABELS[annotation.status]}
              />
            </DetailGroup>

            <DetailGroup title="Work done">
              <DetailField
                label="Segments"
                value={counts ? String(counts.segments) : "…"}
              />
              <DetailField
                label="Tags applied"
                value={counts ? String(counts.tags) : "…"}
              />
              <DetailField
                label="Tags per segment"
                value={
                  counts
                    ? String(round1(counts.tags / Math.max(counts.segments, 1)))
                    : "…"
                }
              />
              <DetailField
                label="Segments per minute"
                value={String(
                  round1(
                    (counts?.segments ?? 0) /
                      Math.max(annotation.durationSec / 60, 1)
                  )
                )}
              />
            </DetailGroup>
          </>
        ) : tab === "activity" ? (
          <ActivityReplay events={activity} />
        ) : (
          <AuditTimeline entries={audit} emptyMessage="Nothing recorded yet." />
        )}
      </DetailPanel>

      <ConfirmDialog
        open={confirm === "approve"}
        onOpenChange={(next) => !next && setConfirm(null)}
        tone="default"
        title={`Approve ${annotation.code}?`}
        description="The annotation is accepted into the corpus and the annotator is credited for it. Sending it back afterwards is still possible."
        confirmLabel="Approve"
        onConfirm={() => {
          onApprove(annotation);
          setConfirm(null);
          onOpenChange(false);
        }}
      />

      <ConfirmDialog
        open={confirm === "rework"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={`Send ${annotation.code} back?`}
        description={`It returns to ${annotation.annotator} as needing rework. Their segments and tags are kept, nothing is discarded.`}
        confirmLabel="Send back"
        onConfirm={() => {
          onSendBack(annotation);
          setConfirm(null);
          onOpenChange(false);
        }}
      />
    </>
  );
}
