import type { ParticipantExtras } from "@/lib/interns/participantMapping";

/**
 * Local sidecar for the participant fields `/focus-groups` cannot store.
 *
 * Keyed by the API's participant id, so a row fetched from the server can pick
 * its own extras back up. This replaces what used to be a full localStorage
 * mirror of a mock dataset — participants now live on the server, and only the
 * four unsupported fields are held here.
 *
 * Read the caveat in `participantMapping.ts`: this is a stopgap for one
 * browser, not storage. Consent in particular needs a real home.
 */

const STORAGE_KEY = "alva-participant-extras-v1";

type ExtrasStore = Record<string, ParticipantExtras>;

function readStore(): ExtrasStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExtrasStore) : {};
  } catch {
    // Private mode, cleared site data, or a corrupt value — behave as empty.
    return {};
  }
}

function writeStore(store: ExtrasStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or a blocked store. The server copy is the one that matters.
  }
}

export function loadParticipantExtras(): ExtrasStore {
  return readStore();
}

export function saveParticipantExtras(entries: Record<string, ParticipantExtras>) {
  writeStore({ ...readStore(), ...entries });
}
