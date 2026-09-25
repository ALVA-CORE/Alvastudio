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
