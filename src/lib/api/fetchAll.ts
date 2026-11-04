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
  {
    pageSize = 200,
    cap = 5000,
    concurrency = 6,
  }: { pageSize?: number; cap?: number; concurrency?: number } = {}
): Promise<{ items: T[]; total: number; complete: boolean }> {
  const first = await page({ limit: pageSize, offset: 0 });
  const total = first.total;
  const want = Math.min(total, cap);

  /* The first page says how many there are, so the rest are asked for side
     by side, a few at a time, rather than one after another: thirty pages in
     sequence is thirty round trips of waiting. Each lands in its own slot,
     so the order is the server's whatever order they answer in. */
  const offsets: number[] = [];
  if (first.items.length > 0) {
    for (let offset = first.items.length; offset < want; offset += pageSize) offsets.push(offset);
  }
  const pages: T[][] = new Array(offsets.length);
  let next = 0;
  const worker = async () => {
    while (next < offsets.length) {
      const slot = next;
      next += 1;
      pages[slot] = (await page({ limit: pageSize, offset: offsets[slot] })).items;
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, offsets.length) }, worker));

  /* An empty page means the server has nothing more to give, whatever the
     total says, so everything after it is dropped. A row that moved between
     pages while they were being read would otherwise be counted twice, so
     rows with an id are kept once. */
  const items: T[] = [...first.items];
  for (const rows of pages) {
    if (!rows || rows.length === 0) break;
    items.push(...rows);
  }
  const seen = new Set<unknown>();
  const unique = items.filter((item) => {
    const id = (item as { id?: unknown } | null)?.id;
    if (id === undefined) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { items: unique, total, complete: unique.length >= total };
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
