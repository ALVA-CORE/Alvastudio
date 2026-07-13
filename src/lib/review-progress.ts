import type { AudioRegion, QualityAnswers } from "@/data/reviewQueue";

const STORAGE_KEY = "alva-review-progress";

export type ReviewProgressSnapshot = {
  answers: QualityAnswers;
  notes: string;
  regions: AudioRegion[];
  playbackTime: number;
  completed: boolean;
  savedAt: number;
};

export type ReviewDisplayStatus = "not-started" | "in-progress" | "completed";

type ProgressStore = Record<string, ReviewProgressSnapshot>;

function readStore(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadReviewProgress(clipId: string): ReviewProgressSnapshot | null {
  return readStore()[clipId] ?? null;
}

export function saveReviewProgress(clipId: string, snapshot: ReviewProgressSnapshot) {
  const store = readStore();
  store[clipId] = { ...snapshot, savedAt: Date.now() };
  writeStore(store);
}

export function markReviewCompleted(clipId: string) {
  const existing = loadReviewProgress(clipId);
  if (!existing) return;
  saveReviewProgress(clipId, { ...existing, completed: true });
}

export function getReviewDisplayStatus(
  clipId: string,
  dataStatus: "pending" | "completed",
  hasDraft?: boolean
): ReviewDisplayStatus {
  const saved = loadReviewProgress(clipId);
  if (saved?.completed || dataStatus === "completed") return "completed";
  if (saved || hasDraft) return "in-progress";
  return "not-started";
}

export function snapshotsEqual(a: ReviewProgressSnapshot, b: ReviewProgressSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}
