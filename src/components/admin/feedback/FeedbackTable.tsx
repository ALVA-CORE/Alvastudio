import { useState } from "react";
import ChatRoundLike from "@solar-icons/react/messages/ChatRoundLike";
import MenuDots from "@solar-icons/react/ui/MenuDots";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import Star from "@solar-icons/react/like/Star";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { NO_VALUE } from "@/lib/no-value";
import { FeedbackDetailPanel } from "@/components/admin/feedback/FeedbackDetailPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  FEEDBACK_KIND_LABEL,
  FEEDBACK_STATUS_LABEL,
  type ApiFeedback,
  type FeedbackStatus,
} from "@/lib/api/feedback";
import type { AdminUserRole } from "@/data/admin/users";
import { cn } from "@/lib/utils";

/**
 * Four statuses, four weights.
 *
 * New reads loudest, because it is the only one anybody has to do something
 * about. In progress is warm: somebody has it. The two settled ones part on
 * weight rather than hue — Done is plain foreground, Dismissed is faded out,
 * which is what being set aside looks like. They were both muted before,
 * which made "we fixed it" and "we are not fixing it" the same answer.
 */
const STATUS_TINT: Record<FeedbackStatus, string> = {
  new: "text-alva-accent",
  reading: "text-amber-300",
  done: "text-foreground",
  wont_fix: "text-muted-foreground/70",
};

function timeLabel(iso: string) {
  const at = new Date(iso);
  const hours = Math.floor((Date.now() - at.getTime()) / 36e5);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

/**
 * What people have told us, on the dashboard where the day starts.
 *
 * At the foot of the page on purpose: it is the thing to read when nothing
 * is on fire, not the thing to open the morning with. The charts above it
 * say what the corpus did; this says what it was like to be the person
 * doing it.
 *
 * The row opens a panel and the dots do the one-click things, which is the
 * same split as every other table on the surface.
 */
export function FeedbackTable({
  rows,
  isLoading,
  error,
  reload,
  setStatus,
}: {
  rows: ApiFeedback[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  setStatus: (id: string, status: FeedbackStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState<ApiFeedback | null>(null);

  const move = async (item: ApiFeedback, status: FeedbackStatus) => {
    try {
      await setStatus(item.id, status);
      alvaToast.success(`Marked ${FEEDBACK_STATUS_LABEL[status].toLowerCase()}`);
    } catch (cause) {
      const message = reportApiError(cause, "Could not change that.");
      if (message) alvaToast.error(message);
    }
  };

  const columns = [
    {
      key: "from",
      header: "From",
      sortable: true,
      sortValue: (row: ApiFeedback) => row.full_name ?? "",
      render: (row: ApiFeedback) => (
        <span className="font-medium text-foreground">
          {row.full_name ?? "Signed out"}
        </span>
      ),
    },
    {
      /* Its own column rather than a tag beside the name. Which role somebody
         is in is the first thing to sort on when the same complaint arrives
         four times, and inline it was also stealing width from the message. */
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (row: ApiFeedback) => row.role ?? "",
      render: (row: ApiFeedback) =>
        row.role ? (
          <RoleTag role={row.role as AdminUserRole} />
        ) : (
          <span className="text-muted-foreground">{NO_VALUE}</span>
        ),
    },
    {
      key: "kind",
      header: "About",
      sortable: true,
      sortValue: (row: ApiFeedback) => row.kind,
      render: (row: ApiFeedback) => (
        <span className="text-muted-foreground">{FEEDBACK_KIND_LABEL[row.kind]}</span>
      ),
    },
    {
      key: "message",
      header: "What they said",
      /* The cell carries the width. A max-width on the span alone does
         nothing: the table cell sizes to its content first and the span
         never reaches its limit, which is why this was running full width. */
      className: "w-[26%] max-w-0",
      render: (row: ApiFeedback) => (
        /* One line here, the whole thing in the panel. A table that wraps a
           paragraph stops being a table. */
        <span className="block truncate text-muted-foreground">{row.message}</span>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      sortValue: (row: ApiFeedback) => row.rating,
      render: (row: ApiFeedback) => (
        <span className="flex items-center gap-1 tabular-nums text-foreground">
          <Star size={13} weight="Bold" className="text-alva-accent" />
          {row.rating}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: ApiFeedback) => row.status,
      render: (row: ApiFeedback) => (
        <span className={cn("text-sm", STATUS_TINT[row.status])}>
          {FEEDBACK_STATUS_LABEL[row.status]}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Sent",
      sortable: true,
      sortValue: (row: ApiFeedback) => new Date(row.created_at).getTime(),
      render: (row: ApiFeedback) => (
        <span className="tabular-nums text-muted-foreground">
          {timeLabel(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      {error ? (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
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

      <AlvaDataTable
        title="Feedback"
        rows={isLoading ? [] : rows}
        columns={columns}
        isLoading={isLoading}
        pageSize={8}
        searchPlaceholder="Search name or message"
        searchKeys={["full_name", "message", "email"]}
        onRowClick={(row) => setOpen(row)}
        mobilePrimary={(row: ApiFeedback) => ({
          title: row.full_name ?? "Signed out",
          subtitle: `${FEEDBACK_KIND_LABEL[row.kind]} · ${timeLabel(row.created_at)}`,
        })}
        renderRowActions={(row: ApiFeedback) => (
          <div
            className="flex justify-end"
            /* The row opens the panel, so a click on the menu must not. */
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for feedback from ${row.full_name ?? "a signed-out person"}`}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <MenuDots size={16} weight="Bold" className="rotate-90" />
                </button>
              </DropdownMenuTrigger>

              {/* Three, and all three are the same kind of thing: where this
                  goes next. Reading it in full is what the row itself does,
                  and a Reply that opens a mail client is not a row action. */}
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="gap-2"
                  disabled={row.status === "reading"}
                  onSelect={() => void move(row, "reading")}
                >
                  <ClockCircle size={15} weight="Outline" />
                  In progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  disabled={row.status === "done"}
                  onSelect={() => void move(row, "done")}
                >
                  <CheckCircle size={15} weight="Outline" />
                  Mark done
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  disabled={row.status === "wont_fix"}
                  onSelect={() => void move(row, "wont_fix")}
                >
                  <CloseCircle size={15} weight="Outline" />
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        emptyState={{
          icon: <ChatRoundLike size={20} weight="Outline" />,
          title: "Nothing yet",
          description:
            "Feedback sent from a profile page lands here, from every role.",
        }}
      />

      <FeedbackDetailPanel
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpen(null);
        }}
        item={open}
        onSetStatus={(item, status) => {
          void move(item, status);
          setOpen(null);
        }}
      />
    </>
  );
}
