import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Keeps a long form's answers across a refresh or a closed tab.
 *
 * The contributor sign-up is five steps of demographic questions. Losing them
 * to a stray refresh means doing the whole thing again, which is the point at
 * which people stop signing up.
 *
 * No store is involved: `react-hook-form` already owns this state, so adding
 * zustand would mean two copies of the same values and a question about which
 * one is right. This writes the form's own values out and reads them back.
 *
 * **Secrets are never written.** `exclude` drops the named fields before the
 * draft is saved, and every caller passes their password fields. A password
 * left in localStorage outlives the session, the tab and the user's memory of
 * having typed it, and no amount of convenience is worth that.
 *
 * The draft is cleared by `clear()`, which the form calls once the account
 * actually exists.
 */
export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  {
    key,
    step,
    onRestoreStep,
    exclude = [],
    enabled = true,
  }: {
    /** Storage key. One per form. */
    key: string;
    /** The step to save alongside the values, for multi-step forms. */
    step?: number;
    onRestoreStep?: (step: number) => void;
    /** Field names never written out. Pass every password field. */
    exclude?: (keyof T & string)[];
    enabled?: boolean;
  }
) {
  /* Read once, before the first save can overwrite what is on disk. */
  const restored = useRef(false);

  useEffect(() => {
    if (!enabled || restored.current) return;
    restored.current = true;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const draft = JSON.parse(raw) as { values?: Partial<T>; step?: number };
      if (!draft.values) return;

      /* Merged over the defaults rather than replacing them, so a draft
       * written before a field existed does not leave it undefined. */
      form.reset({ ...form.getValues(), ...draft.values });
      if (draft.step && onRestoreStep) onRestoreStep(draft.step);
    } catch {
      /* A corrupt or blocked draft is not worth a broken sign-up. */
    }
  }, [enabled, form, key, onRestoreStep]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((values) => {
      try {
        const safe = { ...values } as Partial<T>;
        for (const field of exclude) delete safe[field];
        localStorage.setItem(key, JSON.stringify({ values: safe, step }));
      } catch {
        /* Private mode, or a full quota. The form still works. */
      }
    });

    return () => subscription.unsubscribe();
    // `exclude` is a literal at every call site, so it is stable in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, form, key, step]);

  return {
    clear: () => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* Nothing to do; the draft is only ever read back into a fresh form. */
      }
    },
  };
}
