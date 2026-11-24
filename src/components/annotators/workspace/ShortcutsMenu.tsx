import { useMemo, useState } from "react";
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
        className="max-w-md gap-3 border-alva-border bg-alva-card p-4"
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
          <ShortcutList items={found} mac={mac} empty="Nothing matches" />
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
            {SHORTCUTS.map((group) => (
              <TabsContent key={group.title} value={group.title} className="mt-2">
                <ShortcutList items={group.items} mac={mac} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShortcutList({ items, mac, empty }: { items: Shortcut[]; mac: boolean; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
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
