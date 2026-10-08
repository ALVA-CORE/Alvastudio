import { useEffect, useMemo, useRef, useState } from "react";
import Play from "@solar-icons/react/video/Play";
import Pause from "@solar-icons/react/video/Pause";
import Rewind from "@solar-icons/react/video/RewindBackCircle";
import {
  ACTIVITY_GROUP_COLORS,
  ACTIVITY_OP_GROUP,
  ACTIVITY_OP_LABELS,
  activityEffort,
  activitySpanMinutes,
  activityStateAt,
  type ActivityEvent,
} from "@/data/admin/activity";
import { cn } from "@/lib/utils";

/** Steps per second while playing. Slow enough to read, fast enough to sit through. */
const STEP_MS = 160;

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function wallClock(at: number) {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Playback of how an annotation was built.
 *
 * Scrub and the counters above fold forward to that moment, so you can watch
 * the work accumulate rather than read a finished artefact and guess. The
 * effort strip underneath is wall clock, not audio position: it is where the
 * gaps and the end-of-session bulk-tagging show up, which is the thing the
 * finished annotation can never tell you.
 *
 * Clicking a row in the feed seeks to it, and the feed follows playback.
 */
export function ActivityReplay({ events }: { events: ActivityEvent[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const last = events.length - 1;
  const state = useMemo(() => activityStateAt(events, index), [events, index]);
  const effort = useMemo(() => activityEffort(events), [events]);
  const span = useMemo(() => activitySpanMinutes(events), [events]);
  const peak = Math.max(...effort.map((bar) => bar.count), 1);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [events]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= last) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, last]);

  // Keep the current row in view without yanking the whole panel around.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Nothing has been recorded for this session.
      </p>
    );
  }

  const current = events[index];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-4 gap-2">
        {[
          { label: "Segments", value: state.segments },
          { label: "Speakers", value: state.speakers },
          { label: "Tags", value: state.tags },
          { label: "Edits", value: state.edits },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-alva-surface px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl bg-alva-surface p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause replay" : "Play replay"}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-alva-accent text-alva-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
          >
            {playing ? (
              <Pause size={16} weight="Bold" />
            ) : (
              <Play size={16} weight="Bold" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIndex(0);
            }}
            aria-label="Back to the start"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-alva-card text-foreground transition-colors hover:text-alva-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
          >
            <Rewind size={16} weight="Outline" />
          </button>

          <input
            type="range"
            min={0}
            max={last}
            value={index}
            onChange={(event) => {
              setPlaying(false);
              setIndex(Number(event.target.value));
            }}
            aria-label="Scrub the annotation history"
            className="alva-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-alva-border"
          />

          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {index + 1}/{events.length}
          </span>
        </div>

        <p className="mt-2.5 flex items-baseline gap-2 text-xs">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{
              backgroundColor: ACTIVITY_GROUP_COLORS[ACTIVITY_OP_GROUP[current.op]],
            }}
          />
          <span className="min-w-0 truncate text-foreground">{current.detail}</span>
          <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
            {clock(current.mediaTime)}
          </span>
        </p>
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-xs font-medium text-foreground">Effort</h4>
          <p className="text-[11px] text-muted-foreground">
            {events.length} moves over {span} min
          </p>
        </div>
        {/* Wall clock, one bar a minute. The gaps are the point. */}
        <div className="mt-2 flex h-10 items-end gap-[2px]">
          {effort.map((bar) => (
            <div
              key={bar.minute}
              title={`${bar.count} moves`}
              className={cn(
                "min-w-0 flex-1 rounded-sm",
                bar.count === 0 ? "bg-alva-border/50" : "bg-alva-accent/70"
              )}
              style={{ height: `${Math.max((bar.count / peak) * 100, 6)}%` }}
            />
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-medium text-foreground">Every move</h4>
        <ul
          ref={listRef}
          className="alva-thin-scrollbar mt-2 max-h-72 space-y-0 overflow-y-auto pr-1"
        >
          {events.map((event, position) => {
            const isCurrent = position === index;
            return (
              <li key={event.id} ref={isCurrent ? activeRef : undefined}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setIndex(position);
                  }}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    isCurrent ? "bg-alva-surface" : "hover:bg-alva-surface/60",
                    position > index && "opacity-45"
                  )}
                >
                  <span
                    aria-hidden
                    className="mt-1 size-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        ACTIVITY_GROUP_COLORS[ACTIVITY_OP_GROUP[event.op]],
                    }}
                  />
                  <span className="w-[5.5rem] shrink-0 text-[11px] text-muted-foreground">
                    {ACTIVITY_OP_LABELS[event.op]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                    {event.detail}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {wallClock(event.at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
