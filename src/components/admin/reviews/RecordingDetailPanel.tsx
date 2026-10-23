import { useEffect, useMemo, useState } from "react";
import Restart from "@solar-icons/react/arrows/Restart";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { ClipPlayer } from "@/components/admin/shared/ClipPlayer";
import { ClipPlayerSkeleton } from "@/components/admin/shared/ClipPlayerSkeleton";
import { recordingAudioUrl } from "@/lib/api/recordings";
import {
  AuditTimeline,
  DetailField,
  DetailGroup,
  DetailPanel,
  DetailProse,
  PanelAction,
} from "@/components/admin/shared/detail";
import {
  RECORDING_STATUS_LABELS,
  RUBRIC_LABELS,
  recordingAudit,
  recordingRubric,
  type AdminRecording,
  type RecordingStatus,
} from "@/data/admin/oversight";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<RecordingStatus, PillTone> = {
  approved: "good",
  in_review: "pending",
  submitted: "neutral",
  rejected: "bad",
  flagged: "pending",
};

/**
 * No Activity tab here.
 *
 * `GET /recordings` is prompt reads and stimuli only — a focus group is a
 * separate resource with its own audio, and nothing on this page is ever one.
 * Annotation playback therefore lives on the Annotations panel, which is the
 * only screen whose rows actually have a build history.
 */
const TABS = [
  { id: "detail", label: "Clip" },
  { id: "audit", label: "History" },
];

/**
 * One recording, with the two things the table cannot show: what the reviewer
 * actually answered, and what happened to it since.
 *
 * The rubric is the point. A row that says "Rejected — background noise" tells
 * you the verdict; the four answers tell you whether the reviewer was being
 * strict or the clip was genuinely unusable, which is the difference between
 * retraining a reviewer and retraining a contributor.
 */
export function RecordingDetailPanel({
  open,
  onOpenChange,
  recording,
  onReopen,
  onReassign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: AdminRecording | null;
  onReopen: (recording: AdminRecording) => void;
  onReassign: (recording: AdminRecording) => void;
}) {
  const [tab, setTab] = useState("detail");
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  /** Distinguishes "still fetching" from "this clip has no audio". */
  const [audioLoading, setAudioLoading] = useState(false);

  /**
   * The audio route is authenticated, so an `<audio src>` pointed at it would
   * send no token and 401. Fetch it with the header, hand the player a blob
   * URL, and revoke it when the panel closes or moves to another clip —
   * otherwise every clip an admin opens leaks until the tab is closed.
   */
  useEffect(() => {
    if (!open || !recording) return;

    let url: string | null = null;
    let cancelled = false;
    setAudioLoading(true);

    recordingAudioUrl(recording.id)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        url = blobUrl;
        setAudioUrl(blobUrl);
      })
      .catch(() => setAudioUrl(null))
      .finally(() => {
        if (!cancelled) setAudioLoading(false);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setAudioUrl(null);
    };
  }, [open, recording]);

  const rubric = useMemo(
    () => (recording ? recordingRubric(recording) : []),
    [recording]
  );
  const audit = useMemo(() => (recording ? recordingAudit(recording) : []), [recording]);

  if (!recording) return null;

  const isDecided =
    recording.status !== "submitted" && recording.status !== "in_review";

  return (
    <>
      <DetailPanel
        open={open}
        onOpenChange={(next) => {
          if (!next) setTab("detail");
          onOpenChange(next);
        }}
        title={`Recording ${recording.code}`}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        header={
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
              <Microphone3 size={26} weight="BoldDuotone" className="text-alva-accent" />
            </span>
            <p className="mt-4 text-xl font-semibold tabular-nums text-foreground">
              {recording.code}
            </p>
            <div className="mt-2">
              <AdminStatusPill tone={STATUS_TONE[recording.status]}>
                {RECORDING_STATUS_LABELS[recording.status]}
              </AdminStatusPill>
            </div>
          </div>
        }
        footer={
          <>
            <PanelAction
              icon={<UsersGroupRounded size={15} weight="Outline" />}
              label="Reassign reviewer"
              onClick={() => {
                onReassign(recording);
                onOpenChange(false);
              }}
            />
            {isDecided ? (
              <PanelAction
                icon={<Restart size={15} weight="Outline" />}
                label="Reopen"
                tone="primary"
                onClick={() => setConfirmReopen(true)}
              />
            ) : null}
          </>
        }
      >
        {tab === "detail" ? (
          <>
            <DetailGroup title="Clip" first>
              {audioLoading ? (
                <div className="col-span-2">
                  <ClipPlayerSkeleton />
                </div>
              ) : audioUrl ? (
                <div className="col-span-2">
                  <ClipPlayer src={audioUrl} />
                </div>
              ) : null}
              <DetailProse label="Prompt">{recording.prompt}</DetailProse>
              <DetailField label="Contributor" value={recording.contributor} />
              <DetailField label="Type" value={recording.mode} />
              <DetailField label="Length" value={recording.duration} />
              <DetailField label="Variety" value={recording.variety} />
              <DetailField label="Submitted" value={recording.submittedLabel} />
              <DetailField
                label="Reviewer"
                value={recording.reviewer}
                tone={recording.reviewer ? "default" : "muted"}
              />
            </DetailGroup>

            <DetailGroup title="Reviewer answers">
              <div className="col-span-2">
                <dl className="space-y-0">
                  {rubric.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
                    >
                      <dt className="text-xs text-muted-foreground">{entry.label}</dt>
                      <dd
                        className={cn(
                          "shrink-0 text-xs font-medium",
                          entry.answer === "yes" && "text-alva-accent",
                          entry.answer === "partial" && "text-amber-300",
                          entry.answer === "no" && "text-red-400"
                        )}
                      >
                        {RUBRIC_LABELS[entry.answer]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </DetailGroup>

            {recording.rejectionReason ? (
              <DetailGroup title="Outcome">
                <DetailField
                  label="Reason given"
                  value={recording.rejectionReason}
                  tone="danger"
                  span
                />
              </DetailGroup>
            ) : null}
          </>
        ) : (
          <AuditTimeline entries={audit} emptyMessage="Nothing recorded yet." />
        )}
      </DetailPanel>

      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        tone="default"
        title={`Reopen ${recording.code}?`}
        description="The verdict is cleared and the clip goes back into the review queue. The contributor's counts are adjusted to match."
        confirmLabel="Reopen"
        onConfirm={() => {
          onReopen(recording);
          setConfirmReopen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
