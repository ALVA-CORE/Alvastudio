/**
 * The pictures in the guide.
 *
 * Inline SVG rather than icons, because both show a *relationship* an icon
 * cannot: how far to hold the phone, and what a take looks like end to end.
 * Those are the two things people get wrong, and the two hardest to fix with
 * a sentence.
 *
 * Drawn from the theme's own tokens so they follow the accent and never
 * carry a colour of their own.
 */

/** How far from your mouth, and why the two ends of the range are wrong. */
export function DistanceArt() {
  return (
    <svg
      viewBox="0 0 280 96"
      className="h-auto w-full"
      role="img"
      aria-label="Hold the phone about 15 to 20 centimetres from your mouth"
    >
      {/* Head, in profile, facing the phone. */}
      <circle cx="42" cy="48" r="19" className="fill-alva-surface" />
      <circle cx="50" cy="45" r="2.2" className="fill-muted-foreground" />
      <path
        d="M48 56 q7 4 12 0"
        className="stroke-muted-foreground"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* The sound, opening out towards the phone. */}
      {[0, 1, 2].map((index) => (
        <path
          key={index}
          d={`M${78 + index * 14} ${40 - index * 5} q7 ${8 + index * 5} 0 ${16 + index * 10}`}
          className="stroke-alva-accent"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity={0.85 - index * 0.22}
        />
      ))}

      {/* Phone. */}
      <rect
        x="196"
        y="22"
        width="34"
        height="56"
        rx="7"
        className="fill-alva-surface stroke-alva-border"
        strokeWidth="1.5"
      />
      <circle cx="213" cy="50" r="5" className="fill-alva-accent" />

      {/* The measurement itself, which is the whole point of the drawing. */}
      <line
        x1="66"
        y1="86"
        x2="194"
        y2="86"
        className="stroke-alva-border"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <line x1="66" y1="81" x2="66" y2="91" className="stroke-alva-border" strokeWidth="1.5" />
      <line x1="194" y1="81" x2="194" y2="91" className="stroke-alva-border" strokeWidth="1.5" />
      <text
        x="130"
        y="78"
        textAnchor="middle"
        className="fill-foreground text-[11px] font-medium"
      >
        15–20 cm
      </text>
    </svg>
  );
}

/**
 * The shape of a good take: silence, speech, silence.
 *
 * "Pause before you speak and after you finish" is the single most repeated
 * instruction in the guide and the single most common rejection. Drawn, it
 * takes one glance.
 */
export function TakeShapeArt() {
  /* Deterministic, and deliberately so — this is a diagram of a shape, not a
     sample of anybody's audio. A random waveform here would be decoration
     pretending to be data. */
  const bars = [
    2, 2, 2, 2, 7, 15, 24, 19, 28, 22, 31, 17, 26, 30, 21, 27, 14, 23, 29, 18,
    25, 12, 20, 8, 2, 2, 2, 2,
  ];

  return (
    <svg
      viewBox="0 0 280 72"
      className="h-auto w-full"
      role="img"
      aria-label="A quiet moment, then your voice, then another quiet moment"
    >
      {bars.map((height, index) => {
        const quiet = height <= 2;
        return (
          <rect
            key={index}
            x={8 + index * 9.4}
            y={36 - height / 2}
            width="4.5"
            height={Math.max(height, 3)}
            rx="2.25"
            className={quiet ? "fill-alva-border" : "fill-alva-accent"}
          />
        );
      })}

      <text x="26" y="64" textAnchor="middle" className="fill-muted-foreground text-[9px]">
        wait
      </text>
      <text x="140" y="64" textAnchor="middle" className="fill-foreground text-[9px] font-medium">
        speak
      </text>
      <text x="254" y="64" textAnchor="middle" className="fill-muted-foreground text-[9px]">
        wait
      </text>
    </svg>
  );
}
