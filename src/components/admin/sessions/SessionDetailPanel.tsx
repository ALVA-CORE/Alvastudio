import { useMemo, useState } from "react";
import UsersGroupTwoRounded from "@solar-icons/react/users/UsersGroupTwoRounded";
import Letter from "@solar-icons/react/messages/Letter";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import {
  AuditTimeline,
  DetailField,
  DetailGroup,
  DetailPanel,
  DetailProse,
  PanelAction,
} from "@/components/admin/shared/detail";
import { sessionAudit, type AdminSession } from "@/data/admin/oversight";
import { alvaToast } from "@/lib/alva-toast";
import { round1 } from "@/data/admin/shared";

const TABS = [
  { id: "detail", label: "Session" },
  { id: "audit", label: "History" },
];

/**
 * One focus group session.
 *
 * The missing-audio case gets the loudest treatment here, because it is the
 * one a session can be stuck in silently: the intern has done all the hard
 * work — found people, taken consent, run the conversation — and until a file
 * is attached it produces nothing and reaches nobody. So the panel names that
 * plainly and offers the one action that fixes it: chase the intern.
 */
export function SessionDetailPanel({
  open,
  onOpenChange,
  session,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: AdminSession | null;
  onAssign: (session: AdminSession) => void;
}) {
  const [tab, setTab] = useState("detail");
  const audit = useMemo(() => (session ? sessionAudit(session) : []), [session]);

  if (!session) return null;

  return (
    <DetailPanel
      open={open}
      onOpenChange={(next) => {
        if (!next) setTab("detail");
        onOpenChange(next);
      }}
      title={`Session ${session.code}`}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      header={
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
            <UsersGroupTwoRounded
              size={26}
              weight="BoldDuotone"
              className="text-alva-accent"
            />
          </span>
          <p className="mt-4 text-xl font-semibold tabular-nums text-foreground">
            {session.code}
          </p>
          <div className="mt-2">
            <AdminStatusPill tone={session.hasAudio ? "good" : "bad"}>
              {session.hasAudio ? "Audio uploaded" : "Audio missing"}
            </AdminStatusPill>
          </div>
        </div>
      }
      footer={
        session.hasAudio ? (
          <PanelAction
            icon={<UsersGroupRounded size={15} weight="Outline" />}
            label="Assign to annotator"
            tone="primary"
            onClick={() => {
              onAssign(session);
              onOpenChange(false);
            }}
          />
        ) : (
          <PanelAction
            icon={<Letter size={15} weight="Outline" />}
            label={`Chase ${session.intern.split(" ")[0]}`}
            tone="primary"
            onClick={() =>
              alvaToast.success(`Reminder sent to ${session.intern}`)
            }
          />
        )
      }
    >
      {tab === "detail" ? (
        <>
          {!session.hasAudio ? (
            <div className="mb-6 rounded-xl bg-red-500/10 p-3">
              <p className="text-sm text-red-400">This session reaches nobody</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                A session does not enter the annotation queue until its audio is
                uploaded. Everything below was collected and is currently
                producing nothing.
              </p>
            </div>
          ) : null}

          <DetailGroup title="Session" first>
            <DetailProse label="Topic">{session.topic}</DetailProse>
            <DetailField label="Intern" value={session.intern} />
            <DetailField label="State" value={session.state} />
            <DetailField label="Variety" value={session.variety} />
            <DetailField label="Recorded" value={session.createdLabel} />
          </DetailGroup>

          <DetailGroup title="Contents">
            <DetailField label="Speakers" value={String(session.participants)} />
            <DetailField
              label="Speaker turns"
              value={session.turns > 0 ? String(session.turns) : "—"}
            />
            <DetailField label="Length" value={session.duration} />
            <DetailField
              label="Hours"
              value={
                session.durationSec > 0
                  ? `${round1(session.durationSec / 3600)}h`
                  : "—"
              }
            />
          </DetailGroup>
        </>
      ) : (
        <AuditTimeline entries={audit} emptyMessage="Nothing recorded yet." />
      )}
    </DetailPanel>
  );
}
