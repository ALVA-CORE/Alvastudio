import type { ApiPage } from "./recordings";

/**
 * Every row, not the first page of them.
 *
 * The API caps `limit` at 200, so `listRecordingsPage({ limit: 200 })` reads
 * as "all of them" and is not. A page of 200 drove every figure on the admin
 * review screen: the headline said "Recordings 200" when the number was the
 * page size, the status split and the approval gauge were computed from
 * whichever 200 came back, and a clip approved outside that window never
 * showed up at all. Two admins looking at the same corpus could see different
 * totals depending on how much of it fitted.
 *
 * `total` from the envelope is the authority on when to stop, so a list that
 * grows between requests does not loop. `cap` is a backstop against a server
 * that reports a total it will not serve: better a short list than a tab that
 * requests forever.
 */
export async function fetchAllPages<T>(
  page: (query: { limit: number; offset: number }) => Promise<ApiPage<T>>,
  { pageSize = 200, cap = 5000 }: { pageSize?: number; cap?: number } = {}
): Promise<{ items: T[]; total: number; complete: boolean }> {
  const first = await page({ limit: pageSize, offset: 0 });
  const items = [...first.items];
  const total = first.total;

  /* An empty page means the server has nothing more to give, whatever the
     total says. Without this, a total that overshoots spins forever. */
  while (items.length < Math.min(total, cap) && first.items.length > 0) {
    const next = await page({ limit: pageSize, offset: items.length });
    if (next.items.length === 0) break;
    items.push(...next.items);
  }

  return { items, total, complete: items.length >= total };
}

/**
 * The same, for routes that answer with a bare array.
 *
 * `GET /focus-groups` and `GET /recordings` without `envelope` have no total
 * to stop on, so a short page is the end of the list. That is one request
 * more than the envelope version needs, and it is still better than a
 * hardcoded limit that quietly becomes the answer.
 */
export async function fetchAllRows<T>(
  page: (query: { limit: number; offset: number }) => Promise<T[]>,
  { pageSize = 200, cap = 5000 }: { pageSize?: number; cap?: number } = {}
): Promise<T[]> {
  const items: T[] = [];

  while (items.length < cap) {
    const next = await page({ limit: pageSize, offset: items.length });
    items.push(...next);
    if (next.length < pageSize) break;
  }

  return items;
}
