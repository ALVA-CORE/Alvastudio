import UserRounded from "@solar-icons/react/users/UserRounded";
import type { Speaker } from "@/lib/annotation/types";
import { cn } from "@/lib/utils";

/**
 * Speaker identity chip: a person glyph on a disc tinted with that speaker's
 * colour.
 *
 * The disc is the *only* place a speaker's hue is stated at full strength in the
 * transcript. Everywhere else the colour is either faded (the segment rail) or
 * absent (timestamps, text), so the eye learns one mapping — this face is this
 * colour — and the reading surface stays monochrome.
 */

const SIZES = {
  sm: { box: "size-6", icon: 12 },
  md: { box: "size-7", icon: 14 },
  lg: { box: "size-8", icon: 16 },
} as const;

type SpeakerAvatarProps = {
  speaker: Speaker;
  size?: keyof typeof SIZES;
  className?: string;
};

export function SpeakerAvatar({ speaker, size = "md", className }: SpeakerAvatarProps) {
  const { box, icon } = SIZES[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        box,
        className
      )}
      style={{
        // Tinted disc rather than a flat fill: at full saturation eight speaker
        // discs would out-shout the accent, which is reserved for the play button.
        backgroundColor: `color-mix(in srgb, ${speaker.color} 26%, transparent)`,
        color: speaker.color,
      }}
    >
      <UserRounded size={icon} weight="Bold" />
    </span>
  );
}
