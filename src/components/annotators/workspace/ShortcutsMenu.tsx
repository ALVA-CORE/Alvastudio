import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import InfoCircle from "@solar-icons/react/ui/InfoCircle";
import Magnifier from "@solar-icons/react/search/Magnifier";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isMac, keyLabel, SHORTCUTS, type Shortcut } from "@/lib/annotation/shortcuts";

/**
 * Every shortcut, written for this computer (⌘ on a Mac, Ctrl elsewhere):
 * over a blurred page, a search across them all, and a tab per kind.
 */
export function ShortcutsMenu({ className }: { className?: string }) {
  const mac = useMemo(isMac, []);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const found = q
    ? SHORTCUTS.flatMap((group) =>
        group.items.filter((item) => `${item.label} ${item.keys} ${item.when ?? ""}`.toLowerCase().includes(q))
      )
    : [];

  return (
    <Dialog onOpenChange={() => setQuery("")}>
      <DialogTrigger asChild>
        <button type="button" aria-label="Keyboard shortcuts" className={className}>
          <InfoCircle size={16} weight="Linear" />
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        overlayClassName="bg-black/40 backdrop-blur-sm"
        className="max-w-2xl gap-3 border-alva-border bg-alva-card p-5"
      >
        <DialogTitle className="text-base text-foreground">Keyboard shortcuts</DialogTitle>

        <label className="flex items-center gap-2 rounded-xl bg-alva-surface px-3 py-2">
          <Magnifier size={14} weight="Linear" className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shortcuts and tags"
            aria-label="Search shortcuts and tags"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        {q ? (
          <AutoHeight>
            <ShortcutList items={found} mac={mac} empty="Nothing matches" />
          </AutoHeight>
        ) : (
          <Tabs defaultValue={SHORTCUTS[0].title}>
            <TabsList className="h-9 w-full rounded-full bg-alva-surface p-1">
              {SHORTCUTS.map((group) => (
                <TabsTrigger
                  key={group.title}
                  value={group.title}
                  className="flex-1 rounded-full text-xs data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
                >
                  {group.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {/* Each tab is as tall as its own list; the panel eases between them. */}
            <AutoHeight>
              {SHORTCUTS.map((group) => (
                <TabsContent
                  key={group.title}
                  value={group.title}
                  className="mt-2 duration-200 data-[state=active]:animate-in data-[state=active]:fade-in-0 motion-reduce:animate-none"
                >
                  <ShortcutList items={group.items} mac={mac} />
                </TabsContent>
              ))}
            </AutoHeight>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShortcutList({ items, mac, empty }: { items: Shortcut[]; mac: boolean; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="max-h-[55vh] space-y-1 overflow-y-auto">
      {items.map((item) => (
        <li key={`${item.label}-${item.keys}`} className="flex items-center justify-between gap-3 py-0.5 text-xs">
          <span className="text-muted-foreground">
            {item.label}
            {item.when ? <span className="text-muted-foreground/60"> · {item.when}</span> : null}
          </span>
          <kbd className="shrink-0 rounded-md bg-alva-surface px-1.5 py-0.5 font-sans text-[11px] text-foreground">
            {keyLabel(item.keys, mac)}
          </kbd>
        </li>
      ))}
    </ul>
  );
}

/** Grows and shrinks to fit what is inside, smoothly. */
function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
