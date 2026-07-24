import type { ParticipantRecord } from "@/data/interns/participants";

const STORAGE_KEY = "alva-intern-participants";

const MOCK_PARTICIPANTS: ParticipantRecord[] = [
  {
    id: "p-001",
    nameOrId: "Participant A-14",
    phone: "08012345678",
    ageBracket: "25-34",
    gender: "female",
    state: "Lagos",
    nativeLanguage: "Yoruba",
    sessionLanguage: "mixed",
    consent: "verbal",
    occupation: "Retail",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "p-002",
    nameOrId: "Participant B-07",
    phone: "08023456789",
    ageBracket: "18-24",
    gender: "male",
    state: "Rivers",
    nativeLanguage: "Igbo",
    sessionLanguage: "pidgin",
    consent: "signed",
    occupation: "Transport",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: "p-003",
    nameOrId: "Chioma O.",
    phone: "08034567890",
    ageBracket: "35-44",
    gender: "female",
    state: "FCT",
    nativeLanguage: "English",
    sessionLanguage: "english",
    consent: "verbal",
    occupation: "Healthcare",
    loggedAt: Date.now() - 1000 * 60 * 60 * 5,
  },
];

function readStore(): ParticipantRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_PARTICIPANTS;
    const parsed = JSON.parse(raw) as ParticipantRecord[];
    return parsed.length > 0 ? parsed : MOCK_PARTICIPANTS;
  } catch {
    return MOCK_PARTICIPANTS;
  }
}

function writeStore(records: ParticipantRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function loadParticipants(): ParticipantRecord[] {
  return readStore().sort((a, b) => b.loggedAt - a.loggedAt);
}

export function saveParticipantsBatch(records: ParticipantRecord[]) {
  const next = [...records, ...readStore().filter((item) => !records.some((r) => r.id === item.id))];
  writeStore(next);
}

export function saveParticipant(record: ParticipantRecord) {
  saveParticipantsBatch([record]);
}

export function hasLoggedParticipants(): boolean {
  return readStore().length > 0;
}
