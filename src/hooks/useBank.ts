import { useCallback, useEffect, useRef, useState } from "react";
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
  type CatalogQuery,
} from "@/lib/api/catalog";
import { fetchAllPages } from "@/lib/api/fetchAll";
import type { ApiLanguageVariety } from "@/lib/api/enums";
import { reportApiError } from "@/lib/api/reportApiError";
import { relativeDays } from "@/data/admin/shared";
import {
  bankTotalsFromRows,
  type BankItem,
  type BankKind,
  type BankTotals,
} from "@/data/admin/prompts";
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
    targetParticipants: api.target_participants ?? undefined,
  };
}

export type BankView = {
  kind: BankKind;
  /** Omitted for "all". */
  isActive?: boolean;
  /** Prompts and stimuli only. Omitted for "all". */
  recorded?: boolean;
  /** Prompts and stimuli only: text or category contains this. Blank for none. */
  q?: string;
  /** 1-based. */
  page: number;
  pageSize: number;
};

type CatalogKind = Exclude<BankKind, "topic">;

const listPage = (kind: CatalogKind, query: CatalogQuery) =>
  kind === "prompt" ? listPromptsPage(query) : listStimuliPage(query);

/**
 * Headline numbers for a bank, from the server.
 *
 * Two one-row requests. The first gives the whole bank and how much of it is
 * recorded; the second, scoped to active items, gives the active count and,
 * subtracted, the active items nobody has recorded. `bank_total` falls back
 * to `total` where the API does not send it yet (unfiltered, they agree).
 */
async function fetchTotals(kind: CatalogKind): Promise<BankTotals> {
  const [all, active] = await Promise.all([
    listPage(kind, { limit: 1, offset: 0 }),
    listPage(kind, { limit: 1, offset: 0, is_active: true }),
  ]);
  const activeCount = active.bank_total ?? active.total;
  return {
    bank: all.bank_total ?? all.total,
    active: activeCount,
    recorded: all.recorded_total ?? null,
    neverRecorded:
      active.recorded_total == null ? null : activeCount - active.recorded_total,
  };
}

/**
 * One bank, a page at a time, and every write against it.
 *
 * Prompts and stimuli are paged by the server: the prompt bank is about ten
 * thousand deep, newest first, and anything counted or shown from a single
 * page of it is wrong. Status and recorded filters go to the API with the
 * page, and the totals come back from it too.
 *
 * Topics are a few dozen and have no counts on the API, so they are held
 * whole and filtered and counted here, as before.
 */
export function useBank(view: BankView) {
  const { kind, isActive, recorded, q, page, pageSize } = view;
  const [items, setItems] = useState<BankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<BankTotals | null>(null);
  /* First load of a bank: the page skeleton. A new page of the same bank
     only refreshes the table. */
  const [isLoading, setLoading] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedKind = useRef<BankKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    const firstForKind = loadedKind.current !== kind;
    if (firstForKind) setLoading(true);
    setFetching(true);

    const load = async () => {
      if (kind === "topic") {
        const { items: all } = await fetchAllPages((query) => listTopicsPage(query), {
          stop: () => cancelled,
        });
        const rows = all.map((item) => toBankItem(item, "topic"));
        const shown = rows.filter((row) => isActive == null || row.isActive === isActive);
        return { rows: shown, total: shown.length, totals: bankTotalsFromRows(rows) };
      }

      const [pageResult, nextTotals] = await Promise.all([
        listPage(kind, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          ...(isActive == null ? {} : { is_active: isActive }),
          ...(recorded == null ? {} : { recorded }),
          ...(q ? { q } : {}),
        }),
        fetchTotals(kind),
      ]);
      return {
        rows: pageResult.items.map((item) => toBankItem(item, kind)),
        total: pageResult.total,
        totals: nextTotals,
      };
    };

    load()
      .then((result) => {
        if (cancelled) return;
        setItems(result.rows);
        setTotal(result.total);
        setTotals(result.totals);
        setError(null);
        loadedKind.current = kind;
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the bank."));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, isActive, recorded, q, page, pageSize, attempt]);

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
      /* Topics only. Sending it on a prompt would be a field the bank behind
       * it does not have. */
      ...(kind === "topic" && draft.targetParticipants != null
        ? { target_participants: draft.targetParticipants }
        : {}),
    };
    await (kind === "topic" ? createTopic(body) : createBankItem(kind, body));
    /* Refetched rather than prepended: the counts move, and on a paged bank
       the new item belongs on page one, wherever the table is. */
    reload();
    },
    [reload]
  );

  const save = useCallback(
    async (kind: BankKind, id: string, draft: BankDraft) => {
      /* Text and variety only. Moving an item between banks is a delete and
       * a create, which loses the id every recording points at. */
      const body = {
        text: draft.text,
        language_variety: FROM_VARIETY[draft.variety],
        ...(kind === "topic" && draft.targetParticipants != null
          ? { target_participants: draft.targetParticipants }
          : {}),
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
    await (kind === "topic" ? deleteTopic(id) : deleteBankItem(kind, id));
    /* The active count moves, and under "Active only" the row should go. */
    reload();
  }, [reload]);

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

  return {
    items,
    total,
    totals,
    isLoading,
    isFetching,
    error,
    reload,
    create,
    save,
    retire,
    importCsv,
  };
}
