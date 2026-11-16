import { useState } from "react";
import Bell from "@solar-icons/react/notifications/Bell";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaDataTable, TruncateCell, type AlvaTableColumn } from "@/components/shared/AlvaDataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActionsMenu, type RowAction } from "@/components/shared/RowActionsMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextureButton } from "@/components/ui/texture-button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import {
  DetailField,
  DetailGroup,
  DetailPanel,
  PanelAction,
  formatAuditTimestamp,
} from "@/components/admin/shared/detail";
import { ComposeAnnouncementDialog } from "@/components/admin/announcements/ComposeAnnouncementDialog";
import { people, useAnnouncements, type AnnouncementForm } from "@/hooks/useAnnouncements";
import type { ApiAnnouncement, ApiAnnouncementStatus } from "@/lib/api/announcements";
import { ApiError } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { relativeDays } from "@/data/admin/shared";

type Tab = "draft" | "sent";

const STATUS: Record<ApiAnnouncementStatus, { label: string; tone: PillTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "good" },
  expired: { label: "Expired", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "bad" },
};

const TRIGGER =
  "rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground";

const readBy = (row: ApiAnnouncement) =>
  `Read by ${row.read_count.toLocaleString()} of ${row.recipient_count.toLocaleString()}`;

const canWithdraw = (row: ApiAnnouncement) => row.status === "sent" || row.status === "expired";

/**
 * In-app announcements: drafts, and what has been sent.
 *
 * Writing happens in a dialog; a draft can be edited, deleted or sent, and a
 * sent one only withdrawn. Every write reloads the list.
 */
export default function AdminAnnouncementsPage() {
  const [tab, setTab] = useState<Tab>("draft");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { rows, total, isLoading, isFetching, error, reload, save, send, withdraw, remove } =
    useAnnouncements({ status: tab, page, pageSize });

  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ApiAnnouncement | null>(null);
  const [detail, setDetail] = useState<ApiAnnouncement | null>(null);
  const [sending, setSending] = useState<ApiAnnouncement | null>(null);
  const [withdrawing, setWithdrawing] = useState<ApiAnnouncement | null>(null);
  const [deleting, setDeleting] = useState<ApiAnnouncement | null>(null);
  const [pending, setPending] = useState(false);

  const showTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  /* 404 and 409 both mean the list was stale; it reloads after every write. */
  const fail = (cause: unknown, fallback: string) => {
    if (cause instanceof ApiError && cause.status === 404 && !cause.isUnreachable) {
      alvaToast.error("That announcement no longer exists.");
      return;
    }
    const message = reportApiError(cause, fallback);
    if (message) alvaToast.error(message);
  };

  const openCompose = (row: ApiAnnouncement | null) => {
    setEditing(row);
    setComposing(true);
  };

  const submit = async (form: AnnouncementForm, andSend: boolean) => {
    const saved = await save(form, editing);
    setComposing(false);
    if (andSend) setSending(saved);
    else alvaToast.success("Draft saved");
  };

  /* Runs one confirmed write, then closes its dialog whatever the answer. */
  const confirm = async <T,>(
    call: () => Promise<T>,
    close: () => void,
    fallback: string,
    done: (result: T) => string
  ) => {
    setPending(true);
    try {
      alvaToast.success(done(await call()));
      return true;
    } catch (cause) {
      fail(cause, fallback);
      return false;
    } finally {
      setPending(false);
      close();
    }
  };

  const draftActions = (row: ApiAnnouncement): RowAction[] => [
    { label: "Edit", onSelect: () => openCompose(row) },
    { label: "Send", onSelect: () => setSending(row) },
    { label: "Delete", destructive: true, onSelect: () => setDeleting(row) },
  ];

  const titleColumn: AlvaTableColumn<ApiAnnouncement> = {
    key: "title",
    header: "Title",
    render: (row) => (
      <TruncateCell className="max-w-sm font-medium text-foreground" title={row.title}>
        {row.title}
      </TruncateCell>
    ),
  };

  const columns: AlvaTableColumn<ApiAnnouncement>[] =
    tab === "draft"
      ? [
          titleColumn,
          {
            key: "reaches",
            header: "Reaches",
            render: (row) => (
              <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                {people(row.recipient_count)}
              </span>
            ),
          },
          {
            key: "updated",
            header: "Edited",
            render: (row) => (
              <span className="whitespace-nowrap text-muted-foreground">
                {relativeDays(new Date(row.updated_at))}
              </span>
            ),
          },
        ]
      : [
          titleColumn,
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <AdminStatusPill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</AdminStatusPill>
            ),
          },
          {
            key: "read",
            header: "Read",
            render: (row) => (
              <span className="whitespace-nowrap tabular-nums text-muted-foreground">{readBy(row)}</span>
            ),
          },
          {
            key: "sent",
            header: "Sent",
            render: (row) => (
              <span className="whitespace-nowrap text-muted-foreground">
                {row.sent_at ? relativeDays(new Date(row.sent_at)) : null}
              </span>
            ),
          },
        ];

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="announcements"
        actions={
          <TextureButton variant="alva" size="sm" className="w-auto" onClick={() => openCompose(null)}>
            New announcement
          </TextureButton>
        }
      />

      {error ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton metrics={false} table />
      ) : (
        <Tabs className="mt-3" value={tab} onValueChange={(value) => showTab(value as Tab)}>
          <TabsList className="h-9 rounded-full bg-alva-surface p-1">
            <TabsTrigger value="draft" className={TRIGGER}>
              Drafts
            </TabsTrigger>
            <TabsTrigger value="sent" className={TRIGGER}>
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-2">
            <AlvaDataTable
              title={tab === "draft" ? "Drafts" : "Sent"}
              rows={rows}
              columns={columns}
              pageSize={pageSize}
              isLoading={isFetching}
              serverPaging={{
                total,
                page,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
              onRowClick={(row) => (tab === "draft" ? openCompose(row) : setDetail(row))}
              renderRowActions={(row) =>
                tab === "draft" ? (
                  <RowActionsMenu label={`Actions for ${row.title}`} actions={draftActions(row)} />
                ) : canWithdraw(row) ? (
                  <RowActionsMenu
                    label={`Actions for ${row.title}`}
                    actions={[{ label: "Withdraw", destructive: true, onSelect: () => setWithdrawing(row) }]}
                  />
                ) : null
              }
              mobilePrimary={(row) => ({
                title: row.title,
                subtitle: tab === "draft" ? people(row.recipient_count) : readBy(row),
              })}
              emptyState={{
                icon: <Bell size={20} weight="Outline" />,
                title: tab === "draft" ? "No drafts" : "Nothing sent yet",
              }}
            />
          </TabsContent>
        </Tabs>
      )}

      <ComposeAnnouncementDialog
        open={composing}
        onOpenChange={setComposing}
        existing={editing}
        onSubmit={submit}
        onFailure={(cause) => {
          /* Gone or already sent: nothing left to edit. Otherwise keep what was written. */
          if (cause instanceof ApiError && (cause.status === 404 || cause.status === 409)) {
            setComposing(false);
          }
          fail(cause, "Could not save that.");
        }}
      />

      <DetailPanel
        open={detail !== null}
        onOpenChange={(next) => !next && setDetail(null)}
        title={detail?.title ?? "Announcement"}
        header={
          detail ? (
            <div className="space-y-2 text-center">
              <p className="text-lg font-semibold text-foreground">{detail.title}</p>
              <AdminStatusPill tone={STATUS[detail.status].tone}>{STATUS[detail.status].label}</AdminStatusPill>
            </div>
          ) : null
        }
        footer={
          detail && canWithdraw(detail) ? (
            <PanelAction label="Withdraw" tone="danger" onClick={() => setWithdrawing(detail)} />
          ) : null
        }
      >
        {detail ? (
          <>
            {/* Plain text as written, line breaks kept. */}
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{detail.body}</p>
            <DetailGroup title="Details">
              <DetailField label="Read" value={readBy(detail)} span />
              <DetailField
                label="Sent"
                value={detail.sent_at ? formatAuditTimestamp(new Date(detail.sent_at)) : null}
              />
              <DetailField
                label="Expires"
                value={detail.expires_at ? formatAuditTimestamp(new Date(detail.expires_at)) : "Never"}
              />
              {detail.withdrawn_at ? (
                <DetailField label="Withdrawn" value={formatAuditTimestamp(new Date(detail.withdrawn_at))} />
              ) : null}
              {detail.action_label ? (
                <>
                  <DetailField label="Button" value={detail.action_label} />
                  <DetailField label="Link" value={detail.action_url} />
                </>
              ) : null}
            </DetailGroup>
          </>
        ) : null}
      </DetailPanel>

      <ConfirmDialog
        open={sending !== null}
        onOpenChange={(next) => !next && setSending(null)}
        tone="default"
        title={sending ? `Send to ${people(sending.recipient_count)} now?` : ""}
        description="People who join later will not get it, and it cannot be edited once sent."
        confirmLabel="Send"
        isPending={pending}
        onConfirm={async () => {
          if (!sending) return;
          const id = sending.id;
          const sent = await confirm(
            () => send(id),
            () => setSending(null),
            "Could not send that.",
            (result) => `Sent to ${people(result.recipient_count)}`
          );
          if (sent) showTab("sent");
        }}
      />

      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(next) => !next && setWithdrawing(null)}
        title="Withdraw this announcement?"
        description="It leaves everyone's notifications, read or not. It cannot be sent again."
        confirmLabel="Withdraw"
        isPending={pending}
        onConfirm={() => {
          if (!withdrawing) return;
          const id = withdrawing.id;
          void confirm(
            () => withdraw(id),
            () => {
              setWithdrawing(null);
              setDetail(null);
            },
            "Could not withdraw that.",
            () => "Withdrawn"
          );
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this draft?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isPending={pending}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          void confirm(() => remove(id), () => setDeleting(null), "Could not delete that.", () => "Draft deleted");
        }}
      />
    </DesktopPageShell>
  );
}
