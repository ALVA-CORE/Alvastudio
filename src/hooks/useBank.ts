import { useCallback, useEffect, useState } from "react";
import {
  createBankItem,
  deleteBankItem,
  importBank,
  listPromptsPage,
  listStimuliPage,
  updateBankItem,
  type ApiPrompt,
} from "@/lib/api/catalog";
import type { ApiLanguageVariety } from "@/lib/api/enums";
import { reportApiError } from "@/lib/api/reportApiError";
import { relativeDays } from "@/data/admin/shared";
import type { BankCategory, BankItem, BankKind } from "@/data/admin/prompts";
import type { Variety } from "@/data/admin/shared";
import type { BankDraft } from "@/components/admin/prompts/BankItemForm";

const TO_VARIETY: Record<ApiLanguageVariety, Variety> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

const FROM_VARIETY: Record<Variety, ApiLanguageVariety> = {
  "Nigerian English": "nigerian_english",
  "Nigerian Pidgin": "nigerian_pidgin",
};

/**
 * `category` is free text at the API.
 *
 * It is kept verbatim — the seeded bank is tagged `placeholder` — and read
 * through `bankCategory`, which decides what an item IS from which bank it
 * came out of. The raw value is only consulted for focus group topics, which
 * have no bank of their own.
 */
function toBankItem(api: ApiPrompt, kind: BankKind): BankItem {
  const created = new Date(api.created_at);

  return {
    id: api.id,
    kind,
    text: api.text,
    variety: TO_VARIETY[api.language_variety] ?? "Nigerian English",
    category: api.category ?? "",
    isActive: api.is_active,
    usedByCount: api.used_by_count,
    createdAt: created.getTime(),
    createdLabel: relativeDays(created),
  };
}

/**
 * Both banks, and every write against them.
 *
 * Prompts and stimuli are two endpoints with one shape, so they are fetched
 * together and held in one list keyed by `kind`. The page switches a tab, not
 * a request.
 */
export function useBank() {
  const [items, setItems] = useState<BankItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      listPromptsPage({ limit: 200 }),
      listStimuliPage({ limit: 200 }),
    ])
      .then(([prompts, stimuli]) => {
        if (cancelled) return;
        setItems([
          ...prompts.items.map((item) => toBankItem(item, "prompt")),
          ...stimuli.items.map((item) => toBankItem(item, "stimulus")),
        ]);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the bank."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * `category` carries the tab, not a choice.
   *
   * It is the only way to tell a focus group topic from a prompt, since both
   * live in the prompts bank. Everything else gets the kind it was written to,
   * which is what the table reads back.
   */
  const create = useCallback(
    async (kind: BankKind, draft: BankDraft, category: string = kind) => {
    const api = await createBankItem(kind, {
      text: draft.text,
      language_variety: FROM_VARIETY[draft.variety],
      category,
      is_active: true,
    });
    setItems((prev) => [toBankItem(api, kind), ...prev]);
    },
    []
  );

  const save = useCallback(
    async (kind: BankKind, id: string, draft: BankDraft) => {
      /* Text and variety only. Moving an item between banks is a delete and
       * a create, which loses the id every recording points at. */
      const api = await updateBankItem(kind, id, {
        text: draft.text,
        language_variety: FROM_VARIETY[draft.variety],
      });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? toBankItem(api, kind) : item))
      );
    },
    []
  );

  /**
   * Retire, not remove.
   *
   * `DELETE` returns the row rather than a 204, because an item with
   * recordings against it cannot vanish without breaking them. Whether that
   * comes back deactivated or gone is the API's call, so we take what it gives
   * and drop the row only if it is actually gone.
   */
  const retire = useCallback(async (kind: BankKind, id: string) => {
    const api = await deleteBankItem(kind, id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? toBankItem(api, kind) : item))
    );
  }, []);

  const importCsv = useCallback(
    async (kind: BankKind, file: File) => {
      const result = await importBank(kind, file);
      reload();
      return result;
    },
    [reload]
  );

  return { items, isLoading, error, reload, create, save, retire, importCsv };
}
