import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";

export type AlvaTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
};

type AlvaDataTableProps<T extends { id: string }> = {
  title: string;
  rows: T[];
  columns: AlvaTableColumn<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
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
};

type SortDir = "asc" | "desc";

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
  searchKeys,
  emptyState,
  mobilePrimary,
  renderMobileLeading,
  onRowClick,
  renderRowActions,
  pageSize,
  filterMenuContent,
  activeFilterCount = 0,
}: AlvaDataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const sortableColumns = columns.filter((column) => column.sortable !== false && column.sortValue);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let result = rows;

    if (normalized) {
      result = rows.filter((row) => {
        if (searchKeys?.length) {
          return searchKeys.some((key) =>
            String(row[key] ?? "").toLowerCase().includes(normalized)
          );
        }
        return JSON.stringify(row).toLowerCase().includes(normalized);
      });
    }

    if (!sortKey) return result;

    const column = columns.find((entry) => entry.key === sortKey);
    if (!column?.sortValue) return result;

    return [...result].sort((a, b) =>
      compareValues(column.sortValue!(a), column.sortValue!(b), sortDir)
    );
  }, [rows, query, searchKeys, sortKey, sortDir, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, sortDir, activeFilterCount]);

  const paged = useMemo(() => {
    if (!pageSize) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, currentPage]);

  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * (pageSize ?? filtered.length) + 1;
  const rangeEnd = pageSize
    ? Math.min(currentPage * pageSize, filtered.length)
    : filtered.length;

  const handleHeaderSort = (key: string) => {
    const column = columns.find((entry) => entry.key === key);
    if (!column?.sortValue) return;

    if (sortKey === key) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
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

  return (
    <AlvaSurfaceCard className="flex h-full min-w-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
          {title}
        </h2>
        <div className="flex w-full max-w-md items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Magnifier
              size={16}
              weight="Outline"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded-full border-0 bg-alva-surface pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-alva-accent"
              aria-label={searchPlaceholder}
            />
          </div>
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
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Sort by
              </DropdownMenuLabel>
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
                  onClick={() => setSortDir((direction) => (direction === "asc" ? "desc" : "asc"))}
                  className="text-muted-foreground"
                >
                  Reverse direction ({sortDir === "asc" ? "descending" : "ascending"})
                </DropdownMenuItem>
              )}
              {filterMenuContent && (
                <>
                  <DropdownMenuSeparator />
                  {filterMenuContent}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {emptyState?.icon && (
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
              {emptyState.icon}
            </div>
          )}
          <p className="text-sm font-medium text-foreground">
            {emptyState?.title ?? "Nothing here yet"}
          </p>
          {emptyState?.description && (
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {emptyState.description}
            </p>
          )}
        </div>
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
                        <p className="text-sm font-medium text-foreground">{mobile.title}</p>
                        {mobile.subtitle && (
                          <p className="mt-1 text-xs text-muted-foreground">{mobile.subtitle}</p>
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
                      {column.sortValue ? (
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
                          "max-w-0",
                          column.className,
                          column.key === "_actions" && "text-right"
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

          {pageSize && filtered.length > pageSize && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8 rounded-full bg-alva-surface"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <AltArrowLeft size={16} weight="Outline" />
                </Button>
                <span className="min-w-[4.5rem] text-center text-xs font-medium text-foreground">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8 rounded-full bg-alva-surface"
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  <AltArrowRight size={16} weight="Outline" />
                </Button>
              </div>
            </div>
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
