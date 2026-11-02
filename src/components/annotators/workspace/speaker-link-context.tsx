import { createContext, useContext, type ReactNode } from "react";

/** A Scribe voice, before anybody has said who it is. */
export const isScribeVoice = (speakerId: string) => /^speaker_\d+$/.test(speakerId);

type LinkSpeaker = (
  links: { speaker_label: string; participant_id: string | null }[]
) => Promise<string | null>;

const SpeakerLinkContext = createContext<LinkSpeaker | null>(null);

/**
 * Naming a Scribe voice from anywhere in the transcript.
 *
 * A context rather than props because the row that offers the choice sits
 * three levels below the page that owns the annotation id, and every level
 * between them is about rendering a document rather than about speakers.
 *
 * It exists because picking a speaker means two different things depending
 * on what is currently on the row. On a hand-made segment it is a local,
 * undoable edit to that segment. On a Scribe voice it is a statement about
 * **every** segment that voice covers, and it goes to the API — so the two
 * cannot share a code path even though they share a dropdown.
 */
export function SpeakerLinkProvider({
  onLink,
  children,
}: {
  onLink?: LinkSpeaker;
  children: ReactNode;
}) {
  return (
    <SpeakerLinkContext.Provider value={onLink ?? null}>
      {children}
    </SpeakerLinkContext.Provider>
  );
}

/** Null where naming is not available, such as a read-only draft. */
export function useSpeakerLink() {
  return useContext(SpeakerLinkContext);
}
