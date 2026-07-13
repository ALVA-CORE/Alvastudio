import { useNavigate } from "react-router-dom";
import RoundedMagnifier from "@solar-icons/react/search/RoundedMagnifier";
import { REVIEW_QUEUE } from "@/data/reviewQueue";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";

export default function ReviewPage() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="font-display text-2xl text-foreground">Review</h1>
          </div>
        </div>

        <AlvaDataTable
          title="Pending clips"
          rows={REVIEW_QUEUE}
          pageSize={8}
          searchPlaceholder="Search contributors, mode, prompt"
          searchKeys={["contributor", "mode", "prompt", "language"]}
          onRowClick={(row) => navigate(`/review/${row.id}`)}
          mobilePrimary={(row) => ({
            title: row.contributor,
            subtitle: `${row.mode} · ${row.duration} · ${row.submittedAt}`,
          })}
          emptyState={{
            icon: <RoundedMagnifier size={20} weight="Outline" />,
            title: "No clips in queue",
            description: "New contributor submissions will appear here.",
          }}
          columns={[
            {
              key: "contributor",
              header: "Contributor",
              sortValue: (row) => row.contributor,
              render: (row) => (
                <span className="font-medium text-foreground">{row.contributor}</span>
              ),
            },
            {
              key: "mode",
              header: "Mode",
              sortValue: (row) => row.mode,
              render: (row) => <span className="text-muted-foreground">{row.mode}</span>,
            },
            {
              key: "duration",
              header: "Duration",
              sortValue: (row) => row.durationSec,
              render: (row) => <span className="text-muted-foreground">{row.duration}</span>,
            },
            {
              key: "language",
              header: "Language",
              sortValue: (row) => row.language,
              render: (row) => <span className="text-muted-foreground">{row.language}</span>,
            },
            {
              key: "submitted",
              header: "Submitted",
              sortValue: (row) => row.submittedAt,
              render: (row) => <span className="text-muted-foreground">{row.submittedAt}</span>,
            },
            {
              key: "prompt",
              header: "Prompt",
              render: (row) => (
                <TruncateCell title={row.prompt} className="text-muted-foreground">
                  {row.prompt}
                </TruncateCell>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
