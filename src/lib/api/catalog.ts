import { apiFetch } from "./client";
import type { ApiLanguageVariety } from "./enums";

/**
 * Prompt and stimulus banks. Identical shape, two endpoints — `prompts` is read
 * speech, `stimuli` is open-ended narration.
 */

export type ApiPrompt = {
  id: string;
  text: string;
  language_variety: ApiLanguageVariety;
  category: string | null;
  used_by_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

export type CatalogQuery = {
  language_variety?: ApiLanguageVariety;
  category?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * The next unread item for this contributor.
 *
 * Returns 404 with "No unread prompts available" once they have worked through
 * the bank — an ordinary end state, not an error, so callers should treat it as
 * "queue empty" rather than surfacing it as a failure.
 */
export const nextPrompt = () => apiFetch<ApiPrompt>("/prompts/next");
export const nextStimulus = () => apiFetch<ApiPrompt>("/stimuli/next");

export const listPrompts = (query: CatalogQuery = {}) =>
  apiFetch<ApiPrompt[]>("/prompts", { query });
export const listStimuli = (query: CatalogQuery = {}) =>
  apiFetch<ApiPrompt[]>("/stimuli", { query });

export const getPrompt = (id: string) => apiFetch<ApiPrompt>(`/prompts/${id}`);
export const getStimulus = (id: string) => apiFetch<ApiPrompt>(`/stimuli/${id}`);

/* ------------------------------------------------------------------ *
 * Admin: the whole bank, and writes
 * ------------------------------------------------------------------ */

export type CatalogPage = {
  items: ApiPrompt[];
  total: number;
  limit: number;
  offset: number;
};

/** The bare list puts its count in a header the client cannot read. */
export const listPromptsPage = (query: CatalogQuery = {}) =>
  apiFetch<CatalogPage>("/prompts", { query: { ...query, envelope: true } });

export const listStimuliPage = (query: CatalogQuery = {}) =>
  apiFetch<CatalogPage>("/stimuli", { query: { ...query, envelope: true } });

export type CatalogDraft = {
  text: string;
  language_variety: ApiLanguageVariety;
  category?: string | null;
  is_active?: boolean;
};

const bank = (kind: "prompt" | "stimulus") =>
  kind === "prompt" ? "/prompts" : "/stimuli";

export const createBankItem = (kind: "prompt" | "stimulus", body: CatalogDraft) =>
  apiFetch<ApiPrompt>(bank(kind), { method: "POST", body });

export const updateBankItem = (
  kind: "prompt" | "stimulus",
  id: string,
  body: Partial<CatalogDraft>
) => apiFetch<ApiPrompt>(`${bank(kind)}/${id}`, { method: "PATCH", body });

/**
 * Retires an item. The response is the item as it now stands.
 *
 * A bank item with recordings against it cannot simply vanish, so the API
 * returns the row rather than a 204 — whether that is a delete or a
 * deactivation is its call, and the caller just takes what comes back.
 */
export const deleteBankItem = (kind: "prompt" | "stimulus", id: string) =>
  apiFetch<ApiPrompt>(`${bank(kind)}/${id}`, { method: "DELETE" });

export type ImportResult = {
  added: number;
  skipped: number;
  failed: number;
  failures?: { row: number; reason: string }[];
};

/** CSV bulk create. Multipart, so the browser sets the boundary. */
export const importBank = (kind: "prompt" | "stimulus", file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ImportResult>(`${bank(kind)}/import`, { method: "POST", form });
};
