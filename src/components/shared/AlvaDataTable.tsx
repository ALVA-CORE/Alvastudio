import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import SortVertical from "@solar-icons/react/arrows/SortVertical";
import Magnifier from "@solar-icons/react/search/Magnifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlvaSurfaceCard } from "@/components/shared/AlvaSurfaceCard";
import { FieldBeam } from "@/components/shared/FieldBeam";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { AlvaNoResultsState } from "@/components/shared/states/AlvaNoResultsState";
import { AlvaTableSkeleton } from "@/components/shared/states/AlvaTableSkeleton";
import { cn } from "@/lib/utils";

export type AlvaTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  /** Server-paged tables: the sort key the server takes for this column. */
  serverSort?: string;
};

type AlvaDataTableProps<T extends { id: string }> = {
  title: string;
  rows: T[];
  columns: AlvaTableColumn<T>[];
  searchPlaceholder?: string;
  emptyState?: {
    icon: ReactNode;
    title: string;
    description?: string;
  };
  mobilePrimary?: (row: T) => { title: string; subtitle: string };
  renderMobileLeading?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => ReactNode;
  pageSize?: number;
  filterMenuContent?: ReactNode;
  activeFilterCount?: number;
  isLoading?: boolean;
  /**
   * The server holds the rows and this is one page of them.
   *
   * `rows` is then the current page only, and the table stops searching and
   * sorting: either would act on one page and read as if it covered all of
   * them, which is how the prompt stats went to zero. The pager counts from
   * `total`, and asks for a page rather than slicing one.
   */
  serverPaging?: {
    total: number;
    page: number;
    onPageChange: (page: number) => void;
    /**
     * Lets the reader change how many rows a page holds. The parent owns
     * the size here, because it is what goes in the request. Without it the
     * size is fixed and the picker is not shown.
     */
    onPageSizeChange?: (size: number) => void;
    /**
     * Search on the server: what is typed, trimmed, 300ms after the last
     * key. Without it the search box is hidden, since searching one page
     * would read as searching them all.
     */
    onQueryChange?: (query: string) => void;
    /** Sort on the server, by a column's `serverSort`. Without it no column sorts. */
    onSortChange?: (key: string, dir: "asc" | "desc") => void;
  };
};

/** What a page can hold. The table's own `pageSize` is added if it is not one. */
const PAGE_SIZES = [10, 25, 50, 100];

type SortDir = "asc" | "desc";

/**
 * Everything a row can be found by, lower-cased once.
 *
 * Every field's value, two levels deep (a reviewer's name inside a nested
 * object counts), and every column's sort value, which is what a column shows
 * when its cell is drawn from something other than one field. Values only,
 * never field names: "status" should not match every row.
 */
function searchText<T>(row: T, columns: AlvaTableColumn<T>[]): string {
  const parts: string[] = [];
  const collect = (value: unknown, depth: number) => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
      return;
    }
    if (depth <= 0 || typeof value !== "object") return;
    for (const inner of Array.isArray(value) ? value : Object.values(value as object)) {
      collect(inner, depth - 1);
    }
  };
  collect(row, 2);
  for (const column of columns) {
    if (column.sortValue) parts.push(String(column.sortValue(row)));
  }
  return parts.join(" ").toLowerCase();
}

function compareValues(a: string | number, b: string | number, dir: SortDir) {
  if (typeof a === "number" && typeof b === "number") {
    return dir === "asc" ? a - b : b - a;
  }
  return dir === "asc"
    ? String(a).localeCompare(String(b))
    : String(b).localeCompare(String(a));
}

export function AlvaDataTable<T extends { id: string }>({
  title,
  rows,
  columns,
  searchPlaceholder = "Search",
  emptyState,
  mobilePrimary,
  renderMobileLeading,
  onRowClick,
  renderRowActions,
  pageSize,
  filterMenuContent,
  activeFilterCount = 0,
  isLoading = false,
  serverPaging,
}: AlvaDataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  /* Each row's search text, built once per row object rather than on every
     keystroke. A reload brings new row objects, and so fresh text. */
  const haystacks = useRef(new WeakMap<object, string>());
  /* Client tables own their page size; server tables are told it. */
  const [ownSize, setOwnSize] = useState(pageSize);
  useEffect(() => setOwnSize(pageSize), [pageSize]);
  const size = serverPaging ? pageSize : ownSize;
  const canResize = Boolean(pageSize) && (!serverPaging || Boolean(serverPaging.onPageSizeChange));

  const canSort = (column: AlvaTableColumn<T>) =>
    serverPaging
      ? Boolean(serverPaging.onSortChange && column.serverSort)
      : column.sortable !== false && Boolean(column.sortValue);
  const sortableColumns = columns.filter(canSort);
  const searchable = !serverPaging || Boolean(serverPaging.onQueryChange);

  /* Server search, once typing pauses. The latest callback is kept in a ref
     so a parent re-rendering does not restart the wait. */
  const onQueryChange = useRef(serverPaging?.onQueryChange);
  onQueryChange.current = serverPaging?.onQueryChange;
  const sentQuery = useRef("");
  useEffect(() => {
    const next = query.trim();
    if (!onQueryChange.current || next === sentQuery.current) return;
    const timer = window.setTimeout(() => {
      sentQuery.current = next;
      onQueryChange.current?.(next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    if (serverPaging) return rows;
    const normalized = query.trim().toLowerCase();
    let result = rows;

    if (normalized) {
      /* Every word has to appear somewhere in the row, in any order: "obi
         rejected" finds Esther Obi's rejected clips. */
      const words = normalized.split(/\s+/);
      const cache = haystacks.current;
      result = rows.filter((row) => {
        let haystack = cache.get(row);
        if (haystack === undefined) {
          haystack = searchText(row, columns);
          cache.set(row, haystack);
        }
        return words.every((word) => haystack.includes(word));
      });
    }

    if (!sortKey) return result;

    const column = columns.find((entry) => entry.key === sortKey);
    if (!column?.sortValue) return result;

    return [...result].sort((a, b) =>
      compareValues(column.sortValue!(a), column.sortValue!(b), sortDir)
    );
  }, [rows, query, sortKey, sortDir, columns, serverPaging]);

  const rowCount = serverPaging ? serverPaging.total : filtered.length;
  const totalPages = size ? Math.max(1, Math.ceil(rowCount / size)) : 1;
  const currentPage = Math.min(serverPaging ? serverPaging.page : page, totalPages);
  const goToPage = (next: number) =>
    serverPaging ? serverPaging.onPageChange(next) : setPage(next);

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, sortDir, activeFilterCount]);

  const paged = useMemo(() => {
    if (!size || serverPaging) return filtered;
    const start = (currentPage - 1) * size;
    return filtered.slice(start, start + size);
  }, [filtered, size, currentPage, serverPaging]);

  const rangeStart =
    rowCount === 0 ? 0 : (currentPage - 1) * (size ?? rowCount) + 1;
  /* A new size keeps the first row on screen in view, rather than jumping
     back to page one. */
  const resize = (next: number) => {
    const firstRow = Math.max(0, rangeStart - 1);
    const nextPage = Math.floor(firstRow / next) + 1;
    if (serverPaging) {
      serverPaging.onPageSizeChange?.(next);
      serverPaging.onPageChange(nextPage);
    } else {
      setOwnSize(next);
      setPage(nextPage);
    }
  };

  const applySort = (key: string, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
    const column = columns.find((entry) => entry.key === key);
    if (serverPaging && column?.serverSort) serverPaging.onSortChange?.(column.serverSort, dir);
  };

  const handleHeaderSort = (key: string) => {
    const column = columns.find((entry) => entry.key === key);
    if (!column || !canSort(column)) return;
    applySort(key, sortKey === key && sortDir === "asc" ? "desc" : "asc");
  };

  const tableColumns = renderRowActions
    ? [
        ...columns,
        {
          key: "_actions",
          header: "",
          render: renderRowActions,
          sortable: false as const,
        },
      ]
    : columns;

  const isNullState = rows.length === 0;
  /* A server-paged table holds only the matches, so no rows and a query is
     "nothing matches", not "nothing here". */
  const isNoResults =
    filtered.length === 0 && query.trim().length > 0 && (Boolean(serverPaging) || !isNullState);
  const isEmpty = isNullState || isNoResults;

  return (
    <AlvaSurfaceCard className="flex h-full min-w-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
          {title}
        </h2>
        <div className="flex w-full max-w-md items-center justify-end gap-2">
          {!searchable ? null : (
          <FieldBeam radius={18} className="min-w-0 flex-1 rounded-full">
          <div className="relative">
            <Magnifier
              size={16}
              weight="Outline"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded-full border-0 bg-alva-surface pl-9 text-xs shadow-none placeholder:text-xs focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm sm:placeholder:text-sm"
              aria-label={searchPlaceholder}
            />
          </div>
          </FieldBeam>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="relative size-9 shrink-0 rounded-full bg-alva-surface"
                aria-label="Sort and filter"
              >
                <SortVertical size={18} weight="Outline" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alva-accent px-1 text-[9px] font-semibold text-alva-bg">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-alva-border bg-alva-card">
              {sortableColumns.length > 0 && (
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Sort by
                </DropdownMenuLabel>
              )}
              {sortableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={sortKey === column.key}
                  onCheckedChange={() => handleHeaderSort(column.key)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {column.header}
                  {sortKey === column.key && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </DropdownMenuCheckboxItem>
              ))}
              {sortKey && (
                <DropdownMenuItem
                  onClick={() => applySort(sortKey, sortDir === "asc" ? "desc" : "asc")}
                  className="text-muted-foreground"
                >
                  Reverse direction ({sortDir === "asc" ? "descending" : "ascending"})
                </DropdownMenuItem>
              )}
              {filterMenuContent && (
                <>
                  {sortableColumns.length > 0 && <DropdownMenuSeparator />}
                  {filterMenuContent}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <AlvaTableSkeleton rows={Math.min(size ?? 6, 10)} columns={Math.min(columns.length, 5)} />
      ) : isEmpty ? (
        isNoResults ? (
          <AlvaNoResultsState query={query} />
        ) : (
          <AlvaEmptyState
            icon={emptyState?.icon}
            title={emptyState?.title ?? "Nothing here yet"}
            description={emptyState?.description}
          />
        )
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {paged.map((row) => {
              const mobile = mobilePrimary?.(row) ?? { title: row.id, subtitle: "" };

              return (
                <div
                  key={row.id}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (!onRowClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  className={cn(
                    "w-full rounded-2xl bg-alva-surface px-3 py-3 text-left",
                    onRowClick && "cursor-pointer active:bg-alva-surface/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {renderMobileLeading?.(row)}
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{mobile.title}</p>
                        {mobile.subtitle && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{mobile.subtitle}</p>
                        )}
                      </div>
                    </div>
                    {renderRowActions && (
                      <div
                        className="shrink-0"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {renderRowActions(row)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl bg-alva-surface md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-alva-border hover:bg-transparent">
                  {tableColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={column.key === "_actions" ? "w-12 text-right" : undefined}
                    >
                      {canSort(column) ? (
                        <button
                          type="button"
                          onClick={() => handleHeaderSort(column.key)}
                          className={cn(
                            "inline-flex items-center gap-1 hover:text-foreground",
                            sortKey === column.key && "text-alva-accent"
                          )}
                        >
                          {column.header}
                          {sortKey === column.key && (
                            <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-alva-border",
                      onRowClick && "cursor-pointer hover:bg-alva-card/60"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {tableColumns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          /* `max-w-0` lets the browser share width out by
                             proportion; `truncate` is what actually stops a
                             long cell spilling into its neighbour. A column
                             that needs to overflow can undo it via
                             `column.className`, which is applied after. */
                          "max-w-0 truncate",
                          column.className,
                          column.key === "_actions" && "overflow-visible text-right"
                        )}
                        onClick={
                          column.key === "_actions" ? (event) => event.stopPropagation() : undefined
                        }
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {size && rowCount > Math.min(size, PAGE_SIZES[0]) && (
            <TablePager
              page={currentPage}
              rowCount={rowCount}
              totalPages={totalPages}
              size={size}
              onPage={goToPage}
              onSize={canResize ? resize : undefined}
            />
          )}
        </>
      )}
    </AlvaSurfaceCard>
  );
}

export function TruncateCell({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn("block max-w-[12rem] truncate xl:max-w-[16rem]", className)}
      title={title}
    >
      {children}
    </span>
  );
}


/**
 * The foot of a table: how many rows a page holds, where this page sits, and
 * a way to any page in one step.
 *
 * The page number is a field. Type 340 and press Enter, rather than pressing
 * Next 339 times; the arrows step one.
 * A number out of range is pulled back to the nearest page, and a field left
 * empty goes back to the page it was on.
 */
function TablePager({
  page,
  rowCount,
  totalPages,
  size,
  onPage,
  onSize,
}: {
  page: number;
  /** Every row there is: the server's total, or all that match the search. */
  rowCount: number;
  totalPages: number;
  size: number;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
}) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);

  const commit = () => {
    const wanted = Number.parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(wanted)) {
      setDraft(String(page));
      return;
    }
    const next = Math.min(totalPages, Math.max(1, wanted));
    setDraft(String(next));
    if (next !== page) onPage(next);
  };

  const sizes = PAGE_SIZES.includes(size) ? PAGE_SIZES : [...PAGE_SIZES, size].sort((a, b) => a - b);
  const digits = String(totalPages).length;

  const step = (label: string, target: number, disabled: boolean, icon: ReactNode) => (
    <Button
      variant="secondary"
      size="icon"
      className="size-8 rounded-full bg-alva-surface"
      aria-label={label}
      disabled={disabled}
      onClick={() => onPage(target)}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {onSize ? (
          <Select value={String(size)} onValueChange={(value) => onSize(Number(value))}>
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-auto gap-1.5 rounded-full border-0 bg-alva-surface px-3 text-xs text-foreground focus:ring-1 focus:ring-alva-accent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-alva-border bg-alva-card">
              {sizes.map((option) => (
                <SelectItem key={option} value={String(option)} className="text-xs">
                  {option} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <span className="tabular-nums">of {rowCount.toLocaleString()} rows</span>
      </div>

      <div className="flex items-center gap-1.5">
        {step("Previous page", Math.max(1, page - 1), page <= 1, <AltArrowLeft size={16} weight="Outline" />)}
        <label className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          Page
          <input
            value={draft}
            inputMode="numeric"
            aria-label={`Page, of ${totalPages.toLocaleString()}`}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape") {
                setDraft(String(page));
                event.currentTarget.blur();
              } else if (event.key === "ArrowUp" && page < totalPages) {
                event.preventDefault();
                onPage(page + 1);
              } else if (event.key === "ArrowDown" && page > 1) {
                event.preventDefault();
                onPage(page - 1);
              }
            }}
            style={{ width: `${Math.max(2, digits) + 2}ch` }}
            className="h-8 rounded-full bg-alva-surface text-center text-xs font-medium tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          />
          <span className="tabular-nums">of {totalPages.toLocaleString()}</span>
        </label>
        {step("Next page", Math.min(totalPages, page + 1), page >= totalPages, <AltArrowRight size={16} weight="Outline" />)}
      </div>
    </div>
  );
}
