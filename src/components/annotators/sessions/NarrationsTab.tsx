import { useNavigate } from "react-router-dom";
import ChatRoundDots from "@solar-icons/react/messages/ChatRoundDots";
import { SessionStatusBadge } from "@/components/annotators/sessions/SessionStatusBadge";
import { AlvaDataTable, TruncateCell, type AlvaTableColumn } from "@/components/shared/AlvaDataTable";
import type { NarrationRow } from "@/hooks/useNarrations";
import { formatDuration } from "@/lib/duration";
import { NO_VALUE } from "@/lib/no-value";

const columns: AlvaTableColumn<NarrationRow>[] = [
  {
    key: "stimulus",
    header: "Stimulus",
    sortValue: (row) => row.stimulus,
    render: (row) => (
      <TruncateCell className="max-w-xl text-foreground" title={row.stimulus}>
        {row.stimulus}
      </TruncateCell>
    ),
  },
  {
    key: "duration",
    header: "Length",
    sortValue: (row) => row.durationSec,
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {row.durationSec > 0 ? formatDuration(row.durationSec) : NO_VALUE}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (row) => row.status,
    render: (row) => <SessionStatusBadge status={row.status} />,
  },
];

/**
 * The Sessions page's Narrations tab: this annotator's narrations, a
 * contributor's Stimuli clip each. The page's header, button and cards
 * switch to narrations while it is open.
 */
export function NarrationsTab({ rows, isLoading }: { rows: NarrationRow[]; isLoading: boolean }) {
  const navigate = useNavigate();
  return (
    <AlvaDataTable
      title="Narrations"
      rows={rows}
      columns={columns}
      pageSize={8}
      isLoading={isLoading}
      searchPlaceholder="Search"
      onRowClick={(row) => navigate(`/annotator/narrations/${row.id}`)}
      mobilePrimary={(row) => ({
        title: row.stimulus,
        subtitle: row.durationSec > 0 ? formatDuration(row.durationSec) : NO_VALUE,
      })}
      emptyState={{ icon: <ChatRoundDots size={20} weight="Outline" />, title: "No narrations yet" }}
    />
  );
}
