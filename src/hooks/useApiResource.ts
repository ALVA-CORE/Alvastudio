import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * One fetch, one state machine.
 *
 * Every page that reads a single endpoint wants the same four things: the data,
 * whether it is loading, a readable error, and a retry. Writing that per page
 * produced four slightly different versions of the same bug, so it lives here.
 *
 * `notFoundAsEmpty` exists for the catalog endpoints: `/prompts/next` returns
 * 404 "No unread prompts available" when a contributor has worked through the
 * bank. That is an ordinary end state, not a failure, and it should render the
 * empty state rather than an error banner.
 */

export type ApiResource<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { notFoundAsEmpty?: boolean; enabled?: boolean } = {}
): ApiResource<T> {
  const { notFoundAsEmpty = false, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;

        if (notFoundAsEmpty && cause instanceof ApiError && cause.status === 404) {
          setData(null);
          setError(null);
          return;
        }

        setError(
          cause instanceof ApiError ? cause.message : "Something went wrong."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt, enabled]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { data, isLoading, error, reload };
}
