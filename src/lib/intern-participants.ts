import type { ParticipantRecord } from "@/data/interns/participants";

const STORAGE_KEY = "alva-intern-participants";

const MOCK_PARTICIPANTS: ParticipantRecord[] = [
  {
    id: "p-001",
    nameOrId: "Participant A-14",
    phone: "+234 801 234 5678",
    ageBracket: "25-34",
    gender: "Female",
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
    phone: "+234 802 345 6789",
    ageBracket: "18-24",
    gender: "Male",
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
    phone: "+234 803 456 7890",
    ageBracket: "35-44",
    gender: "Female",
    state: "Abuja",
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

export function saveParticipant(record: ParticipantRecord) {
  const next = [record, ...readStore().filter((item) => item.id !== record.id)];
  writeStore(next);
}

export function hasLoggedParticipants(): boolean {
  return readStore().length > 0;
}
