import { useCallback, useEffect, useState } from "react";
import {
  createBankItem,
  createTopic,
  deleteBankItem,
  deleteTopic,
  importBank,
  listPromptsPage,
  listStimuliPage,
  listTopicsPage,
  updateBankItem,
  updateTopic,
  type ApiPrompt,
} from "@/lib/api/catalog";
import type { ApiLanguageVariety } from "@/lib/api/enums";
import { reportApiError } from "@/lib/api/reportApiError";
import { useDevUiState } from "@/hooks/use-dev-ui-state";
import { BANK_ITEMS } from "@/data/admin/prompts";
import { relativeDays } from "@/data/admin/shared";
import type { BankItem, BankKind } from "@/data/admin/prompts";
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
  const { forceDemo: demo } = useDevUiState();
  const [items, setItems] = useState<BankItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (demo) {
      setItems(BANK_ITEMS);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      listPromptsPage({ limit: 200 }),
      listStimuliPage({ limit: 200 }),
      listTopicsPage({ limit: 200 }),
    ])
      .then(([prompts, stimuli, topics]) => {
        if (cancelled) return;
        setItems([
          ...prompts.items.map((item) => toBankItem(item, "prompt")),
          ...stimuli.items.map((item) => toBankItem(item, "stimulus")),
          ...topics.items.map((item) => toBankItem(item, "topic")),
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
  }, [attempt, demo]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /**
   * `category` carries the tab, not a choice.
   *
   * It is the only way to tell a focus group topic from a prompt, since both
   * live in the prompts bank. Everything else gets the kind it was written to,
   * which is what the table reads back.
   */
  const create = useCallback(
    async (kind: BankKind, draft: BankDraft) => {
    const body = {
      text: draft.text,
      language_variety: FROM_VARIETY[draft.variety],
      is_active: true,
    };
    const api =
      kind === "topic" ? await createTopic(body) : await createBankItem(kind, body);
    setItems((prev) => [toBankItem(api, kind), ...prev]);
    },
    []
  );

  const save = useCallback(
    async (kind: BankKind, id: string, draft: BankDraft) => {
      /* Text and variety only. Moving an item between banks is a delete and
       * a create, which loses the id every recording points at. */
      const body = {
        text: draft.text,
        language_variety: FROM_VARIETY[draft.variety],
      };
      const api =
        kind === "topic"
          ? await updateTopic(id, body)
          : await updateBankItem(kind, id, body);
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
    const api = kind === "topic" ? await deleteTopic(id) : await deleteBankItem(kind, id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? toBankItem(api, kind) : item))
    );
  }, []);

  /** CSV import is prompts and stimuli only — topics have no import route. */
  const importCsv = useCallback(
    async (kind: BankKind, file: File) => {
      if (kind === "topic") {
        throw new Error("Topics cannot be imported from a file yet.");
      }
      const result = await importBank(kind, file);
      reload();
      return result;
    },
    [reload]
  );

  return { items, isLoading, error, reload, create, save, retire, importCsv };
}
