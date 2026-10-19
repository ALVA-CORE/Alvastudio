import { useCallback, useEffect, useState } from "react";
import { listTopicsPage } from "@/lib/api/catalog";
import { reportApiError } from "@/lib/api/reportApiError";

export type FocusGroupTopic = {
  id: string;
  text: string;
};

/**
 * The topics an intern can run a session on.
 *
 * Active only: a retired topic is refused at session creation, so offering one
 * would be offering a card that cannot be recorded. Admins curate this bank on
 * the prompts page, which is the whole reason it exists — the topic used to be
 * free text typed at record time, so nothing could be reused or reported on.
 */
export function useFocusGroupTopics() {
  const [topics, setTopics] = useState<FocusGroupTopic[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listTopicsPage({ is_active: true, limit: 200 })
      .then((page) => {
        if (cancelled) return;
        setTopics(page.items.map((item) => ({ id: item.id, text: item.text })));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the topics."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { topics, isLoading, error, reload };
}
