import type { ParticipantRecord } from "@/data/interns/participants";

const STORAGE_KEY = "alva-intern-participants";

const MOCK_PARTICIPANTS: ParticipantRecord[] = [
  {
    id: "p-001",
    sessionId: "sess-001",
    nameOrId: "Participant A-14",
    phone: "08012345678",
    ageBracket: "25-34",
    gender: "female",
    state: "Lagos",
    nativeLanguage: "Yoruba",
    sessionLanguage: "mixed",
    consent: "verbal",
    occupation: "Retail",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: "p-002",
    sessionId: "sess-001",
    nameOrId: "Participant B-07",
    phone: "08023456789",
    ageBracket: "18-24",
    gender: "male",
    state: "Lagos",
    nativeLanguage: "Igbo",
    sessionLanguage: "mixed",
    consent: "signed",
    occupation: "Transport",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: "p-003",
    sessionId: "sess-002",
    nameOrId: "Chioma O.",
    phone: "08034567890",
    ageBracket: "35-44",
    gender: "female",
    state: "FCT",
    nativeLanguage: "English",
    sessionLanguage: "english",
    consent: "verbal",
    occupation: "Healthcare",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: "p-004",
    sessionId: "sess-002",
    nameOrId: "Participant C-22",
    phone: "08045678901",
    ageBracket: "45-54",
    gender: "male",
    state: "Rivers",
    nativeLanguage: "Ikwerre",
    sessionLanguage: "pidgin",
    consent: "signed",
    occupation: "Construction",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: "p-005",
    sessionId: "sess-003",
    nameOrId: "Amaka N.",
    phone: "08056789012",
    ageBracket: "25-34",
    gender: "female",
    state: "Enugu",
    nativeLanguage: "Igbo",
    sessionLanguage: "english",
    consent: "verbal",
    occupation: "Education",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "p-006",
    sessionId: "sess-003",
    nameOrId: "Participant D-09",
    phone: "08067890123",
    ageBracket: "18-24",
    gender: "male",
    state: "Kano",
    nativeLanguage: "Hausa",
    sessionLanguage: "mixed",
    consent: "verbal",
    occupation: "Logistics",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "p-007",
    sessionId: "sess-003",
    nameOrId: "Participant E-31",
    phone: "08078901234",
    ageBracket: "55+",
    gender: "female",
    state: "Oyo",
    nativeLanguage: "Yoruba",
    sessionLanguage: "pidgin",
    consent: "signed",
    occupation: "Food service",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "p-008",
    sessionId: "sess-004",
    nameOrId: "Tunde A.",
    phone: "08089012345",
    ageBracket: "35-44",
    gender: "male",
    state: "Ogun",
    nativeLanguage: "Yoruba",
    sessionLanguage: "mixed",
    consent: "verbal",
    occupation: "Finance",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "p-009",
    sessionId: "sess-004",
    nameOrId: "Participant F-18",
    phone: "08090123456",
    ageBracket: "25-34",
    gender: "female",
    state: "Edo",
    nativeLanguage: "Edo",
    sessionLanguage: "english",
    consent: "signed",
    occupation: "Creative arts",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "p-010",
    sessionId: "sess-005",
    nameOrId: "Blessing U.",
    phone: "08101234567",
    ageBracket: "18-24",
    gender: "female",
    state: "Delta",
    nativeLanguage: "Urhobo",
    sessionLanguage: "pidgin",
    consent: "verbal",
    occupation: "Beauty & wellness",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: "p-011",
    sessionId: "sess-005",
    nameOrId: "Participant G-03",
    phone: "08112345678",
    ageBracket: "45-54",
    gender: "male",
    state: "Kaduna",
    nativeLanguage: "Hausa",
    sessionLanguage: "mixed",
    consent: "signed",
    occupation: "Agriculture",
    loggedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: "p-012",
    sessionId: "sess-006",
    nameOrId: "Ngozi P.",
    phone: "08123456789",
    ageBracket: "25-34",
    gender: "female",
    state: "Anambra",
    nativeLanguage: "Igbo",
    sessionLanguage: "english",
    consent: "verbal",
    occupation: "Public sector",
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

export function createSessionId() {
  return `sess-${crypto.randomUUID().slice(0, 8)}`;
}
