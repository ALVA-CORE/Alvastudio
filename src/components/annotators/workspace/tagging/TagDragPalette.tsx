import { memo, useState } from "react";
import { ScrollableTabStrip } from "@/components/annotators/workspace/tagging/ScrollableTabStrip";
import { NON_SPEECH_COLOR, TAG_FAMILIES } from "@/lib/annotation/tags";
import { SOUND_TAGS } from "@/lib/annotation/markers";
import { endTagDrag, startTagDrag, type DraggedTag } from "@/lib/annotation/tagDrag";
import { cn } from "@/lib/utils";

const SOUNDS = "sounds";

/**
 * Tags to drag onto the transcript: a word tag onto a word (or the
 * highlighted words), a sound between two words. One family at a time, so
 * the chips fit the panel.
 */
export const TagDragPalette = memo(function TagDragPalette() {
  const [family, setFamily] = useState<string>(TAG_FAMILIES[0].kind);
  const groups = [
    ...TAG_FAMILIES.map((entry) => ({ key: entry.kind as string, label: entry.shortLabel, color: entry.color })),
    { key: SOUNDS, label: "Sounds", color: NON_SPEECH_COLOR },
  ];
  const chips: { key: string; label: string; tag: DraggedTag }[] =
    family === SOUNDS
      ? SOUND_TAGS.map((sound) => ({
          key: sound.type,
          label: `[${sound.marker}]`,
          tag: { sound: sound.type, color: NON_SPEECH_COLOR },
        }))
      : (TAG_FAMILIES.find((entry) => entry.kind === family)?.options ?? []).map((option) => {
          const entry = TAG_FAMILIES.find((item) => item.kind === family)!;
          return { key: option.value, label: option.label, tag: { kind: entry.kind, value: option.value, color: entry.color } };
        });

  return (
    <div className="space-y-2">
      <ScrollableTabStrip label="Tag families to drag">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            role="tab"
            aria-selected={family === group.key}
            onClick={() => setFamily(group.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
              family === group.key ? "bg-alva-surface text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
            {group.label}
          </button>
        ))}
      </ScrollableTabStrip>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.key}
            draggable
            onDragStart={(event) => startTagDrag(event, chip.tag)}
            onDragEnd={endTagDrag}
            title="Drag onto the transcript"
            className="inline-flex cursor-grab select-none items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] text-foreground transition-transform active:scale-95 active:cursor-grabbing"
            style={{
              borderColor: `color-mix(in srgb, ${chip.tag.color} 45%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${chip.tag.color} 10%, transparent)`,
            }}
          >
            {"sound" in chip.tag ? null : (
              <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: chip.tag.color }} />
            )}
            <span style={"sound" in chip.tag ? { color: NON_SPEECH_COLOR } : undefined}>{chip.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
});
