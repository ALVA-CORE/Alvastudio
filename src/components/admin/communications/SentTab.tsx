import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import { RingChart } from "@/components/charts/ring-chart";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import {
  getCommunication,
  listCommunicationRecipients,
  listCommunications,
  type ApiCommunication,
  type ApiCommunicationDeliveryStatus,
  type ApiCommunicationRecipient,
  type ApiDeliveryCounts,
} from "@/lib/api/communications";
import { relativeDays } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

/** Accepted, waiting, refused, and the rest folded together. */
const OUTCOMES = [
  { key: "sent", label: "Accepted", color: "hsl(146 87% 54%)" },
  { key: "pending", label: "Waiting", color: "hsl(38 92% 50%)" },
  { key: "failed", label: "Refused", color: "hsl(0 84% 66%)" },
  { key: "other", label: "Skipped", color: "hsl(240 5% 46%)" },
] as const;

const DOT: Record<ApiCommunicationDeliveryStatus, string> = {
  sent: "bg-alva-accent",
  pending: "bg-amber-400",
  failed: "bg-red-400",
  skipped: "bg-muted-foreground/50",
  removed: "bg-muted-foreground/30",
};

const value = (delivery: ApiDeliveryCounts, key: (typeof OUTCOMES)[number]["key"]) =>
  key === "other" ? delivery.skipped + delivery.removed : delivery[key];

/** What became of them, as rings against the whole audience. */
function OutcomeRings({ delivery }: { delivery: ApiDeliveryCounts }) {
  const total = Math.max(1, delivery.total);
  const rings = OUTCOMES.filter((outcome) => value(delivery, outcome.key) > 0);
  const data = (rings.length ? rings : OUTCOMES.slice(0, 1)).map((outcome) => ({
    label: outcome.label,
    value: value(delivery, outcome.key),
    maxValue: total,
    color: outcome.color,
  }));

  return (
    <div className="flex items-center gap-4">
      <div className="size-36 shrink-0">
        <RingChart data={data} strokeWidth={10} ringGap={5} baseInnerRadius={26}>
          {data.map((_, index) => (
            <Ring key={index} index={index} showGlow={index === 0} />
          ))}
          <RingCenter
            defaultLabel="sent to"
            valueClassName="text-sm font-semibold leading-none tabular-nums text-foreground"
            labelClassName="mt-0.5 text-[9px] leading-none text-muted-foreground"
          />
        </RingChart>
      </div>
      <dl className="min-w-0 flex-1 space-y-1.5">
        {OUTCOMES.map((outcome) => (
          <div key={outcome.key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: outcome.color }} />
              {outcome.label}
            </dt>
            <dd className="tabular-nums text-foreground">
              {value(delivery, outcome.key).toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const sum = (rows: ApiCommunication[]): ApiDeliveryCounts =>
  rows.reduce(
    (acc, row) => ({
      total: acc.total + row.delivery.total,
      pending: acc.pending + row.delivery.pending,
      sent: acc.sent + row.delivery.sent,
      failed: acc.failed + row.delivery.failed,
      skipped: acc.skipped + row.delivery.skipped,
      removed: acc.removed + row.delivery.removed,
    }),
    { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0, removed: 0 }
  );

const going = (row: ApiCommunication) => row.status === "queued" || row.status === "sending";

/**
 * What has gone out. All of it as rings first, then one row per email.
 * A row opens to its own rings and who it went to. Anything still going out
 * is refreshed every few seconds while the panel is open.
 */
export function SentTab({ version }: { version: number }) {
  const [rows, setRows] = useState<ApiCommunication[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listCommunications({ limit: 50 })
      .then((page) => {
        if (!cancelled) setRows(page.items.filter((row) => row.status !== "draft"));
      })
      .catch(() => {
        if (!cancelled) setRows((prev) => prev ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [version, tick]);

  const anyGoing = rows?.some(going) ?? false;
  useEffect(() => {
    if (!anyGoing) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((value) => value + 1);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [anyGoing]);

  const totals = useMemo(() => sum(rows ?? []), [rows]);
  const open = rows?.find((row) => row.id === openId) ?? null;

  return (
    <AnimatePresence initial={false} mode="wait">
      {open ? (
        <motion.div
          key={open.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2 }}
        >
          <SentDetail row={open} tick={tick} onBack={() => setOpenId(null)} />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {rows === null ? (
            <div className="space-y-2">
              <div className="h-36 animate-pulse rounded-2xl bg-alva-surface" />
              <div className="h-12 animate-pulse rounded-2xl bg-alva-surface" />
              <div className="h-12 animate-pulse rounded-2xl bg-alva-surface" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nothing sent yet</p>
          ) : (
            <>
              <div className="rounded-2xl bg-alva-surface p-4">
                <OutcomeRings delivery={totals} />
              </div>
              <ul className="divide-y divide-alva-border/70">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(row.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-alva-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent"
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          going(row) ? "animate-pulse bg-amber-400" : row.delivery.failed ? "bg-red-400" : "bg-alva-accent"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">{row.subject}</span>
                        <span className="block text-xs text-muted-foreground">
                          {relativeDays(new Date(row.queued_at ?? row.updated_at))}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {row.delivery.sent.toLocaleString()}/{row.delivery.total.toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PAGE = 50;
/** The recipients route's largest page. */
const MAX_PAGE = 200;

function SentDetail({
  row,
  tick,
  onBack,
}: {
  row: ApiCommunication;
  tick: number;
  onBack: () => void;
}) {
  const [delivery, setDelivery] = useState(row.delivery);
  const [people, setPeople] = useState<ApiCommunicationRecipient[]>([]);
  const [total, setTotal] = useState(0);
  /* How many rows are open. The refresh while it is still sending re-reads
     this many, not the first page: re-reading one page is what used to
     close everything "more" had just opened. */
  const loaded = useRef(PAGE);

  useEffect(() => {
    let cancelled = false;
    void getCommunication(row.id)
      .then((detail) => !cancelled && setDelivery(detail.delivery))
      .catch(() => undefined);

    const read = async () => {
      const rows: ApiCommunicationRecipient[] = [];
      let count = 0;
      while (rows.length < loaded.current) {
        const page = await listCommunicationRecipients(row.id, {
          limit: Math.min(MAX_PAGE, loaded.current - rows.length),
          offset: rows.length,
        });
        rows.push(...page.items);
        count = page.total;
        if (page.items.length === 0 || rows.length >= page.total) break;
      }
      return { rows, count };
    };

    void read()
      .then(({ rows, count }) => {
        if (cancelled) return;
        setPeople(rows);
        setTotal(count);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [row.id, tick]);

  const more = async () => {
    const page = await listCommunicationRecipients(row.id, { limit: PAGE, offset: people.length });
    loaded.current = people.length + page.items.length;
    setPeople((prev) => [...prev, ...page.items]);
    setTotal(page.total);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex max-w-full items-center gap-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
      >
        <AltArrowLeft size={16} weight="Outline" className="shrink-0 text-muted-foreground" />
        <span className="truncate">{row.subject}</span>
      </button>

      <div className="rounded-2xl bg-alva-surface p-4">
        <OutcomeRings delivery={delivery} />
      </div>

      <ul className="divide-y divide-alva-border/70">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", DOT[person.status])} />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {person.full_name ?? "—"}
            </span>
            <span className="shrink-0 truncate text-xs text-muted-foreground">
              {person.error ?? person.email ?? ""}
            </span>
          </li>
        ))}
      </ul>
      {people.length < total ? (
        <button
          type="button"
          onClick={() => void more()}
          className="w-full rounded-full py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {(total - people.length).toLocaleString()} more
        </button>
      ) : null}
    </div>
  );
}
