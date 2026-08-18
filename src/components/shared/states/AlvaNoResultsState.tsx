import Magnifier from "@solar-icons/react/search/Magnifier";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";

type AlvaNoResultsStateProps = {
  query?: string;
};

export function AlvaNoResultsState({ query }: AlvaNoResultsStateProps) {
  return (
    <AlvaEmptyState
      icon={<Magnifier size={20} weight="Outline" />}
      title="No results found"
      description={
        query?.trim()
          ? `Nothing matched “${query.trim()}”. Try a different search.`
          : "Try adjusting your search or filters."
      }
    />
  );
}
