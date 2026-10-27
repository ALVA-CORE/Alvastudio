/**
 * The contributor guide, as data.
 *
 * Written by Lolu, 27 Oct 2026. Kept as structure rather than a blob of
 * markup so the sheet can render each kind of thing the way it deserves ,
 * the setup steps as a checklist, the rejection reasons as cards, the two
 * recording modes as their own sections. A wall of prose on a phone is a
 * wall nobody climbs.
 *
 * It is static copy, not data about anybody, which is why it lives here and
 * not behind a fetch: it has to work the first time somebody opens the app
 * on a bad connection, which is exactly when they need it.
 */

export type GuideStep = {
  /** Icon key, resolved in the component , this file stays free of JSX. */
  icon: GuideIcon;
  title: string;
  detail: string;
};

export type GuideIcon =
  | "quiet"
  | "alone"
  | "phone"
  | "distance"
  | "room"
  | "still"
  | "device"
  | "text"
  | "whole"
  | "pause"
  | "natural"
  | "retake"
  | "playback"
  | "language"
  | "topic"
  | "unscripted"
  | "keepGoing"
  | "private"
  | "clean"
  | "mix";

export const SETUP_STEPS: GuideStep[] = [
  {
    icon: "quiet",
    title: "Find a quiet room",
    detail:
      "Close doors and windows. Turn off the TV, radio, fan, generator and music if you can.",
  },
  {
    icon: "alone",
    title: "Be alone",
    detail: "Nobody else should talk, laugh or call out in the background.",
  },
  {
    icon: "phone",
    title: "Silence your phone",
    detail: "Turn off notifications so no ringtones or buzzing get recorded.",
  },
  {
    icon: "distance",
    title: "Hold it a hand-length away",
    detail:
      "About 15–20 cm from your mouth. Closer distorts your voice, further makes you faint.",
  },
  {
    icon: "room",
    title: "Avoid echoey spaces",
    detail:
      "Bathrooms, stairwells and empty rooms echo. A room with curtains, a bed or a sofa sounds better.",
  },
  {
    icon: "still",
    title: "Stay still",
    detail: "Do not move around or tap the phone while it is recording.",
  },
  {
    icon: "device",
    title: "Use the device in your profile",
    detail: "If you switch phones or microphones, update your profile.",
  },
];

export const PROMPT_STEPS: GuideStep[] = [
  {
    icon: "text",
    title: "Read it exactly as written",
    detail:
      "Word for word. Do not add, skip or change anything, even if you would normally say it differently.",
  },
  {
    icon: "whole",
    title: "Read the whole sentence",
    detail: "Do not stop halfway or cut off the last word.",
  },
  {
    icon: "pause",
    title: "Leave a beat at each end",
    detail:
      "Wait a moment after pressing record before you speak, and a moment after you finish before you stop.",
  },
  {
    icon: "natural",
    title: "Sound like yourself",
    detail:
      "Normal pace, normal volume, your own accent. Do not put on a foreign accent or read like a robot.",
  },
  {
    icon: "retake",
    title: "Start again if you stumble",
    detail:
      "A mispronounced word, a cough or a restart in the middle will get the recording rejected.",
  },
  {
    icon: "playback",
    title: "Listen before you send",
    detail: "One play-through to check it is clear and complete.",
  },
  {
    icon: "language",
    title: "Use the language shown",
    detail: "Pidgin sentence, Pidgin reading. English sentence, English reading.",
  },
];

export const NARRATION_STEPS: GuideStep[] = [
  {
    icon: "topic",
    title: "Stay on the topic",
    detail: "A story about something else will be rejected. Read the topic again before you start.",
  },
  {
    icon: "unscripted",
    title: "Talk, do not read",
    detail:
      "Say it the way you would to a friend. Small pauses and “ehn” or “you know” are fine.",
  },
  {
    icon: "keepGoing",
    title: "Keep talking",
    detail:
      "Up to 2 minutes. Long silences are trimmed off and not paid, so only your speaking time counts.",
  },
  {
    icon: "private",
    title: "Keep private things private",
    detail:
      "Real stories and opinions, but no addresses, bank details, phone numbers or other people's information.",
  },
  {
    icon: "clean",
    title: "Keep it clean",
    detail: "No insults, hate speech or sexual content.",
  },
  {
    icon: "mix",
    title: "Mixing is fine",
    detail: "English and Pidgin together, if that is how you naturally speak.",
  },
];

/**
 * Why recordings get rejected.
 *
 * This was a nine-row, three-column table. A table on a phone is either a
 * horizontal scroll or four-point type, and this is the part somebody reads
 * *after* a rejection , when they are annoyed and looking for one specific
 * row. So each reason is a card: the name, what it means, and the fix, with
 * the fix visually separated because it is the only line that tells them
 * what to do next.
 */
export type Rejection = {
  reason: string;
  meaning: string;
  fix: string;
};

export const REJECTIONS: Rejection[] = [
  {
    reason: "Transcript mismatch",
    meaning: "What you said does not match the sentence on screen: words added, skipped or changed.",
    fix: "Read word for word, and re-record if you slip.",
  },
  {
    reason: "Off-topic narration",
    meaning: "Your story does not answer the topic shown.",
    fix: "Read the topic again before you start.",
  },
  {
    reason: "Background noise",
    meaning: "TV, music, traffic, fans, generators or animals can be heard.",
    fix: "Record in a quiet, closed room.",
  },
  {
    reason: "Other voices",
    meaning: "Someone else talks, laughs or calls out.",
    fix: "Record alone.",
  },
  {
    reason: "Distortion",
    meaning: "Your voice sounds crackly, buzzy or breaking up.",
    fix: "Hold the phone 15–20 cm away, and do not shout.",
  },
  {
    reason: "Too quiet",
    meaning: "Your voice is faint or hard to hear.",
    fix: "Move closer and speak at normal volume.",
  },
  {
    reason: "Cut off",
    meaning: "The start or end of the sentence is missing.",
    fix: "Pause briefly after pressing record, and before pressing stop.",
  },
  {
    reason: "Unclear speech",
    meaning: "Mumbling, reading too fast, or a put-on accent.",
    fix: "Speak clearly at your normal pace and accent.",
  },
  {
    reason: "Too much silence",
    meaning: "Little or no speech in the recording.",
    fix: "Keep talking through the narration.",
  },
  {
    reason: "Wrong language",
    meaning: "An English sentence read in Pidgin, or the other way round.",
    fix: "Match the language shown on screen.",
  },
  {
    reason: "Fake or copied audio",
    meaning:
      "AI-generated, replayed, sped-up, or somebody else's voice. This can close your account.",
    fix: "Only ever record your own live voice.",
  },
];
