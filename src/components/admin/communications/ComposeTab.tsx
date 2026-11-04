import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Gallery from "@solar-icons/react/video/Gallery";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import Magnifier from "@solar-icons/react/search/Magnifier";
import { BeamInput } from "@/components/auth/BeamInput";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { Input } from "@/components/ui/input";
import { RichBodyEditor } from "@/components/admin/communications/RichBodyEditor";
import { toPlainText } from "@/lib/admin/richBody";
import { NIGERIAN_STATES } from "@/data/interns/participants";
import { COMMUNICATION_LIMITS } from "@/lib/api/communications";
import { actionUrlProblem, DEFAULT_ACTION_URL } from "@/lib/admin/emailTemplate";
import { alvaToast } from "@/lib/alva-toast";
import type { ComposerFields } from "@/hooks/useCommsComposer";
import type { DirectoryContributor } from "@/hooks/useContributorDirectory";
import { cn } from "@/lib/utils";

const HERO_MAX_BYTES = 5 * 1024 * 1024;
const ANY_STATE = "__any__";

type Set_ = <K extends keyof ComposerFields>(key: K, value: ComposerFields[K]) => void;

export function ComposeTab({
  fields,
  set,
  contributors,
  loadingContributors,
}: {
  fields: ComposerFields;
  set: Set_;
  contributors: DirectoryContributor[];
  loadingContributors: boolean;
}) {
  const linkProblem = fields.link.trim() ? actionUrlProblem(fields.link.trim()) : null;

  return (
    <div className="space-y-3">
      <HeroDrop value={fields.hero} onChange={(next) => set("hero", next)} />

      <BeamInput
        label="Header"
        value={fields.header}
        maxLength={COMMUNICATION_LIMITS.subject}
        onChange={(event) => set("header", event.target.value)}
      />

      <RichBodyEditor
        value={fields.bodyDoc}
        onChange={(doc) => {
          set("bodyDoc", doc);
          set("body", toPlainText(doc));
        }}
      />

      <div className="grid grid-cols-[2fr_3fr] gap-2">
        <BeamInput
          label="Button"
          value={fields.button}
          maxLength={COMMUNICATION_LIMITS.actionLabel}
          onChange={(event) => set("button", event.target.value)}
        />
        <BeamInput
          label={fields.link.trim() && fields.link.trim() !== DEFAULT_ACTION_URL ? "Link · changed" : "Link"}
          inputMode="url"
          value={fields.link}
          aria-invalid={Boolean(linkProblem) || undefined}
          className={cn(linkProblem && "text-destructive")}
          maxLength={COMMUNICATION_LIMITS.actionUrl}
          onChange={(event) => set("link", event.target.value)}
        />
      </div>

      <Recipients
        fields={fields}
        set={set}
        contributors={contributors}
        isLoading={loadingContributors}
      />
    </div>
  );
}

/** Drop an image on it, or press it to choose one. */
function HeroDrop({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  /* A data URL, not an object URL: the preview is a sandboxed frame with an
     origin of its own, and it cannot read this page's blob: URLs. */
  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alvaToast.error("That is not an image");
      return;
    }
    if (file.size > HERO_MAX_BYTES) {
      alvaToast.error("Images up to 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "relative h-28 overflow-hidden rounded-2xl border border-dashed transition-colors",
        over ? "border-alva-accent bg-alva-accent/[0.06]" : "border-alva-border bg-alva-surface"
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <AnimatePresence initial={false} mode="wait">
        {value ? (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/90 backdrop-blur transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              <CloseCircle size={18} weight="Bold" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="empty"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            aria-label="Hero image"
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent"
          >
            <Gallery size={22} weight="Outline" />
            <span className="text-xs">Hero image</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Everyone, or the people ticked here. A state narrows the list to whoever
 * gave it as their state of origin or residence; the box at the top ticks
 * everyone the list is showing.
 */
function Recipients({
  fields,
  set,
  contributors,
  isLoading,
}: {
  fields: ComposerFields;
  set: Set_;
  contributors: DirectoryContributor[];
  isLoading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState(ANY_STATE);
  const selected = useMemo(() => new Set(fields.selected), [fields.selected]);
  const choosing = fields.audience === "selected_contributors";

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contributors.filter((person) => {
      if (
        state !== ANY_STATE &&
        person.stateOfOrigin !== state &&
        person.stateOfResidence !== state
      ) {
        return false;
      }
      return (
        !needle ||
        person.name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle)
      );
    });
  }, [contributors, query, state]);

  const allShown = shown.length > 0 && shown.every((person) => selected.has(person.id));
  const someShown = shown.some((person) => selected.has(person.id));

  const commit = (next: Set<string>) => set("selected", [...next].sort());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < COMMUNICATION_LIMITS.recipients) next.add(id);
    commit(next);
  };

  const toggleShown = () => {
    const next = new Set(selected);
    if (allShown) shown.forEach((person) => next.delete(person.id));
    else
      for (const person of shown) {
        if (next.size >= COMMUNICATION_LIMITS.recipients) break;
        next.add(person.id);
      }
    commit(next);
  };

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Recipients" className="grid grid-cols-2 rounded-full bg-alva-surface p-1">
        {(
          [
            { value: "all_contributors", label: "Everyone" },
            {
              value: "selected_contributors",
              label: fields.selected.length ? `Chosen · ${fields.selected.length}` : "Choose",
            },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={fields.audience === option.value}
            onClick={() => set("audience", option.value)}
            className="relative rounded-full py-1.5 text-sm text-muted-foreground transition-colors aria-checked:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            {fields.audience === option.value ? (
              <motion.span
                layoutId="comms-audience"
                className="absolute inset-0 rounded-full bg-alva-card"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <span className="relative tabular-nums">{option.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {choosing ? (
          <motion.div
            key="choose"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Magnifier
                    size={14}
                    weight="Outline"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    aria-label="Search contributors"
                    className="h-9 rounded-full border-0 bg-alva-surface pl-8 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                  />
                </div>
                <AlvaSelect
                  aria-label="State"
                  value={state}
                  onValueChange={setState}
                  className="w-32"
                  options={[
                    { value: ANY_STATE, label: "All states" },
                    ...NIGERIAN_STATES.map((name) => ({ value: name, label: name })),
                  ]}
                />
              </div>

              <div className="alva-thin-scrollbar max-h-52 overflow-y-auto rounded-2xl bg-alva-surface">
                <label className="sticky top-0 z-[1] flex cursor-pointer items-center gap-3 border-b border-alva-border/60 bg-alva-surface px-3.5 py-2 text-xs text-muted-foreground">
                  <AuthCheckbox
                    checked={allShown ? true : someShown ? "indeterminate" : false}
                    onCheckedChange={toggleShown}
                    disabled={shown.length === 0}
                    aria-label="Select all shown"
                  />
                  <span className="tabular-nums">{shown.length.toLocaleString()}</span>
                </label>
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="h-8 animate-pulse rounded-lg bg-alva-card" />
                    ))}
                  </div>
                ) : (
                  <ul>
                    {shown.map((person) => (
                      <li key={person.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2 transition-colors hover:bg-alva-card/60">
                          <AuthCheckbox
                            checked={selected.has(person.id)}
                            onCheckedChange={() => toggle(person.id)}
                            aria-label={person.name}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {person.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {person.stateOfOrigin ?? person.stateOfResidence ?? ""}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
