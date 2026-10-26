import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import {
  DetailField,
  DetailGroup,
  DetailPanel,
  PanelAction,
  formatAuditTimestamp,
} from "@/components/admin/shared/detail";
import { PeekRating } from "@/components/ui/peek-rating";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import { NO_VALUE } from "@/lib/no-value";
import {
  FEEDBACK_KIND_LABEL,
  FEEDBACK_STATUS_LABEL,
  type ApiFeedback,
  type FeedbackStatus,
} from "@/lib/api/feedback";
import type { AdminUserRole } from "@/data/admin/users";
import { cn } from "@/lib/utils";

/**
 * One piece of feedback, in full.
 *
 * The message is the point, so it gets the top of the panel rather than a
 * truncated cell three rows down. Everything else — who, which screen, when —
 * is context for reading it, and sits under it.
 *
 * There is no reply here. The product has no messaging, a mailto button only
 * hands the conversation to a mail client, and the person's address is a row
 * below for anybody who wants to do that themselves. The actions are the
 * three this queue actually has: in progress, done, set aside.
 */
export function FeedbackDetailPanel({
  open,
  onOpenChange,
  item,
  onSetStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApiFeedback | null;
  onSetStatus: (item: ApiFeedback, status: FeedbackStatus) => void;
}) {
  if (!item) return null;

  const name = item.full_name ?? "Someone signed out";
  const initials = (item.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      preferredWidth={520}
      header={
        <div className="flex flex-col items-center text-center">
          <Avatar
            className={cn(
              alvaAccentTextureClass,
              "size-20 border-0 bg-transparent shadow-none ring-0"
            )}
          >
            {item.email ? (
              <AvatarImage src={diceBearAvatarUrl(item.email, "202020")} alt="" />
            ) : null}
            <AvatarFallback className="bg-alva-surface text-xl font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <p className="mt-4 text-lg font-semibold text-foreground">{name}</p>

          <div className="mt-1 flex items-center gap-2">
            {item.role ? <RoleTag role={item.role as AdminUserRole} /> : null}
            <span className="text-sm text-muted-foreground">
              · {FEEDBACK_KIND_LABEL[item.kind]}
            </span>
          </div>

          <div className="mt-3">
            <PeekRating
              readOnly
              value={item.rating}
              size={18}
              activeColor="hsl(var(--alva-accent))"
              idleColor="hsl(var(--muted-foreground))"
            />
          </div>
        </div>
      }
      footer={
        <>
          {item.status === "done" || item.status === "wont_fix" ? (
            <PanelAction label="Reopen" onClick={() => onSetStatus(item, "new")} />
          ) : (
            <>
              <PanelAction label="Dismiss" onClick={() => onSetStatus(item, "wont_fix")} />
              <PanelAction
                label="Mark done"
                tone="primary"
                onClick={() => onSetStatus(item, "done")}
              />
            </>
          )}
        </>
      }
    >
      {/* The whole message, wrapped, never clipped. A bug report cut at the
          column width is a bug report nobody can act on. */}
      <div className="rounded-xl bg-alva-surface p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {item.message}
        </p>
      </div>

      <DetailGroup title="Where it came from">
        <DetailField label="Email" value={item.email ?? NO_VALUE} span />
        <DetailField label="Screen" value={item.page ?? NO_VALUE} />
        <DetailField label="Status" value={FEEDBACK_STATUS_LABEL[item.status]} />
        <DetailField
          label="Sent"
          value={formatAuditTimestamp(new Date(item.created_at))}
          span
        />
        <DetailField label="Rating" value={`${item.rating} of 5`} span />
      </DetailGroup>
    </DetailPanel>
  );
}
