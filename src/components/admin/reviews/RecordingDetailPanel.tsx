import { useMemo, useState } from "react";
import Restart from "@solar-icons/react/arrows/Restart";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
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
                pushRight
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
