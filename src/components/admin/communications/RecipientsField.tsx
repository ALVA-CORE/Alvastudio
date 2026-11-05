import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import MapPoint from "@solar-icons/react/map/MapPoint";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import { NIGERIAN_STATES } from "@/data/interns/participants";
import { COMMUNICATION_LIMITS } from "@/lib/api/communications";
import { alvaToast } from "@/lib/alva-toast";
import type { ComposerFields } from "@/hooks/useCommsComposer";
import type { DirectoryContributor } from "@/hooks/useContributorDirectory";
import { alvaAccentTexture } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

type Set_ = <K extends keyof ComposerFields>(key: K, value: ComposerFields[K]) => void;

type Suggestion =
  | { kind: "everyone"; key: string; count: number }
  | { kind: "state"; key: string; state: string; count: number }
  | { kind: "person"; key: string; person: DirectoryContributor };

/**
 * People drawn in the list at once. More than this and the list asks for a
 * few more letters instead: thousands of rows in a dropdown is not a list
 * anyone reads.
 */
const PEOPLE_SHOWN = 150;
/** People chips shown before the rest fold into "+N". */
const CHIPS_SHOWN = 6;

const inState = (person: DirectoryContributor, state: string) =>
  person.stateOfOrigin === state || person.stateOfResidence === state;

/** Picked people and whole states, as the ids they come to, capped. */
function resolve(people: string[], states: string[], contributors: DirectoryContributor[]) {
  const ids = new Set(people);
  if (states.length) {
    for (const person of contributors) {
      if (states.some((state) => inState(person, state))) ids.add(person.id);
    }
  }
  const all = [...ids].sort();
  return { ids: all.slice(0, COMMUNICATION_LIMITS.recipients), capped: all.length > COMMUNICATION_LIMITS.recipients };
}

/**
 * The To row, as an inbox has it: chips, and a field to type into.
 *
 * Everyone, a whole state, or people one at a time, in any mix. Typing
 * suggests all three; Enter or a press picks one; Backspace on an empty
 * field takes the last chip off. Picking Everyone clears the rest, and
 * picking anyone else replaces Everyone. A state is everyone whose state of
 * origin or residence it is, and is counted when picked.
 */
export function RecipientsField({
  fields,
  set,
  contributors,
}: {
  fields: ComposerFields;
  set: Set_;
  contributors: DirectoryContributor[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const everyone = fields.audience === "all_contributors";

  const byId = useMemo(() => new Map(contributors.map((person) => [person.id, person])), [contributors]);
  const perState = useMemo(() => {
    const counts = new Map<string, number>();
    for (const state of NIGERIAN_STATES) counts.set(state, 0);
    for (const person of contributors) {
      for (const state of new Set([person.stateOfOrigin, person.stateOfResidence])) {
        if (state) counts.set(state, (counts.get(state) ?? 0) + 1);
      }
    }
    return counts;
  }, [contributors]);

  const commit = (people: string[], states: string[]) => {
    const { ids, capped } = resolve(people, states, contributors);
    if (capped) alvaToast.error(`One email can go to ${COMMUNICATION_LIMITS.recipients.toLocaleString()} people at most`);
    set("audience", "selected_contributors");
    set("people", people);
    set("states", states);
    set("selected", ids);
  };

  /* States resolve against the directory, which may land after they are
     picked (a draft carried across pages, say). */
  useEffect(() => {
    if (everyone || fields.states.length === 0) return;
    const { ids } = resolve(fields.people, fields.states, contributors);
    if (ids.join() !== fields.selected.join()) set("selected", ids);
  }, [everyone, contributors, fields.people, fields.states, fields.selected, set]);

  /* Everything that can be picked, narrowed by what is typed: Everyone,
     then every state that has someone in it, then people. */
  const { suggestions, morePeople } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const out: Suggestion[] = [];
    if (!everyone && (!needle || "everyone all contributors".includes(needle))) {
      out.push({ kind: "everyone", key: "everyone", count: contributors.length });
    }
    NIGERIAN_STATES.filter(
      (state) =>
        !fields.states.includes(state) &&
        (perState.get(state) ?? 0) > 0 &&
        (!needle || state.toLowerCase().includes(needle))
    )
      .sort((a, b) => (perState.get(b) ?? 0) - (perState.get(a) ?? 0))
      .forEach((state) =>
        out.push({ kind: "state", key: `state:${state}`, state, count: perState.get(state) ?? 0 })
      );
    let people = 0;
    let more = 0;
    for (const person of contributors) {
      if (!everyone && fields.people.includes(person.id)) continue;
      if (
        needle &&
        !person.name.toLowerCase().includes(needle) &&
        !person.email.toLowerCase().includes(needle)
      ) {
        continue;
      }
      if (people >= PEOPLE_SHOWN) {
        more += 1;
        continue;
      }
      people += 1;
      out.push({ kind: "person", key: person.id, person });
    }
    return { suggestions: out, morePeople: more };
  }, [query, everyone, contributors, fields.states, fields.people, perState]);

  const list = useRef<HTMLUListElement>(null);
  /* The highlighted row stays in view as the arrows move through a list
     longer than the dropdown. */
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  useEffect(() => setActive(0), [query]);

  const pick = (choice: Suggestion) => {
    if (choice.kind === "everyone") {
      set("audience", "all_contributors");
      set("people", []);
      set("states", []);
      set("selected", []);
    } else if (choice.kind === "state") {
      commit(everyone ? [] : fields.people, [...(everyone ? [] : fields.states), choice.state]);
    } else {
      commit([...(everyone ? [] : fields.people), choice.person.id], everyone ? [] : fields.states);
    }
    setQuery("");
    input.current?.focus();
  };

  const removeLast = () => {
    if (everyone) {
      commit([], []);
      return;
    }
    if (fields.people.length) commit(fields.people.slice(0, -1), fields.states);
    else if (fields.states.length) commit(fields.people, fields.states.slice(0, -1));
  };

  const people = showAll ? fields.people : fields.people.slice(0, CHIPS_SHOWN);
  const hidden = fields.people.length - people.length;

  return (
    <div className="relative">
      <div
        className="flex min-h-12 flex-wrap items-center gap-1.5 py-2"
        onClick={() => input.current?.focus()}
      >
        <span className="mr-1 text-sm text-muted-foreground">To</span>

        <AnimatePresence initial={false}>
          {everyone ? (
            <Chip key="everyone" icon={<UsersGroupRounded size={13} weight="Bold" />} onRemove={() => commit([], [])}>
              Everyone
              {contributors.length ? <span className="tabular-nums text-muted-foreground"> · {contributors.length}</span> : null}
            </Chip>
          ) : null}
          {!everyone
            ? fields.states.map((state) => (
                <Chip
                  key={`state:${state}`}
                  icon={<MapPoint size={13} weight="Bold" />}
                  onRemove={() => commit(fields.people, fields.states.filter((value) => value !== state))}
                >
                  {state}
                  <span className="tabular-nums text-muted-foreground"> · {perState.get(state) ?? 0}</span>
                </Chip>
              ))
            : null}
          {!everyone
            ? people.map((id) => (
                <Chip
                  key={id}
                  icon={initialOf(byId.get(id)?.name ?? "?")}
                  onRemove={() => commit(fields.people.filter((value) => value !== id), fields.states)}
                >
                  {byId.get(id)?.name ?? "Contributor"}
                </Chip>
              ))
            : null}
        </AnimatePresence>
        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-full px-2 py-0.5 text-xs tabular-nums text-muted-foreground hover:text-foreground"
          >
            +{hidden}
          </button>
        ) : null}

        <input
          ref={input}
          value={query}
          aria-label="To"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="comms-to-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={open && suggestions[active] ? `comms-to-${active}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((value) => Math.min(suggestions.length - 1, value + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(0, value - 1));
            } else if (event.key === "Enter" && open && suggestions[active]) {
              event.preventDefault();
              pick(suggestions[active]);
            } else if (event.key === "Backspace" && !query) {
              removeLast();
            } else if (event.key === "Escape" && open) {
              event.stopPropagation();
              setOpen(false);
            }
          }}
          className="h-7 min-w-[8rem] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 ? (
          <motion.ul
            ref={list}
            id="comms-to-suggestions"
            role="listbox"
            aria-label="Recipients"
            /* Pressing the scrollbar or a heading must not blur the field,
               or the list closes under the pointer. */
            onMouseDown={(event) => event.preventDefault()}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="alva-thin-scrollbar absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-alva-border bg-alva-card py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
          >
            {suggestions.map((choice, index) => {
              const heading =
                choice.kind !== suggestions[index - 1]?.kind && choice.kind !== "everyone"
                  ? choice.kind === "state"
                    ? "States"
                    : "People"
                  : null;
              return (
                <li key={choice.key} role="presentation">
                  {heading ? (
                    <p className="px-3.5 pb-1 pt-2 text-[11px] text-muted-foreground">{heading}</p>
                  ) : null}
                  <div
                    id={`comms-to-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === active}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(choice)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3.5 py-2 text-sm",
                      index === active ? "bg-alva-surface text-foreground" : "text-foreground/90"
                    )}
                  >
                    <Badge choice={choice} />
                    <span className="min-w-0 flex-1 truncate">
                      {choice.kind === "everyone"
                        ? "Everyone"
                        : choice.kind === "state"
                          ? choice.state
                          : choice.person.name}
                    </span>
                    <span className="shrink-0 truncate text-xs tabular-nums text-muted-foreground">
                      {choice.kind === "person" ? choice.person.email : choice.count.toLocaleString()}
                    </span>
                  </div>
                </li>
              );
            })}
            {morePeople > 0 ? (
              <li role="presentation" className="px-3.5 py-2 text-xs text-muted-foreground">
                {morePeople.toLocaleString()} more, type to narrow
              </li>
            ) : null}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Chip({
  icon,
  children,
  onRemove,
}: {
  icon: ReactNode;
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.14 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-alva-surface py-1 pl-1 pr-1.5 text-xs text-foreground"
    >
      <Dot>{icon}</Dot>
      <span className="max-w-[12rem] truncate">{children}</span>
      <button
        type="button"
        aria-label="Remove"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <CloseCircle size={15} weight="Bold" />
      </button>
    </motion.span>
  );
}

/** The round mark in front of a chip or a suggestion: textured accent. */
function Dot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={alvaAccentTexture(cn("flex size-5 shrink-0 items-center justify-center rounded-full", className))}>
      <span className="relative z-[1] flex items-center justify-center text-alva-bg">{children}</span>
    </span>
  );
}

function initialOf(name: string) {
  return <span className="text-[10px] font-bold leading-none">{name.trim().slice(0, 1).toUpperCase()}</span>;
}

function Badge({ choice }: { choice: Suggestion }) {
  return (
    <Dot className="size-6">
      {choice.kind === "everyone" ? (
        <UsersGroupRounded size={13} weight="Bold" />
      ) : choice.kind === "state" ? (
        <MapPoint size={13} weight="Bold" />
      ) : (
        initialOf(choice.person.name)
      )}
    </Dot>
  );
}
