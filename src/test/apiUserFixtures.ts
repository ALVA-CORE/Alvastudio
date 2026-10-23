import { ADMIN_USERS } from "@/data/admin/users";
import { BANK_ITEMS } from "@/data/admin/prompts";
import {
  ADMIN_ANNOTATIONS,
  ADMIN_RECORDINGS,
  ADMIN_SESSIONS,
} from "@/data/admin/oversight";
import type { ApiUser } from "@/lib/api/users";

/**
 * The seeded accounts, in the shape `GET /users` returns.
 *
 * The admin users screen reads from the network now, so a test that renders it
 * needs a server or a stand-in. This is the stand-in, built from the same
 * seeded rows the screen used to read directly, so what the tests assert
 * against has not changed.
 */
export function seededApiUsers(): ApiUser[] {
  return ADMIN_USERS.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    phone: row.phone,
    role: row.role,
    is_active: row.isActive,
    approved: row.approval !== "pending",
    intern_approved: row.approval !== "pending",
    created_at: new Date(row.createdAt).toISOString(),
  }));
}

/** The seeded recordings, in the shape `GET /recordings` returns. */
export function seededApiRecordings() {
  return ADMIN_RECORDINGS.filter((row) => row.mode !== "Focus group").map((row) => ({
    id: row.id,
    contributor_id: `c-${row.id}`,
    session_type: row.mode === "Stimuli" ? "stimuli_narration" : "prompt_read",
    prompt_id: null,
    stimulus_id: null,
    prompt_text: row.prompt,
    stimulus_text: null,
    audio_content_type: "audio/webm",
    audio_size_bytes: 1024,
    original_filename: null,
    duration_seconds: row.durationSec,
    device_mic: null,
    status: row.status,
    assigned_reviewer_id: row.reviewer ? `r-${row.id}` : null,
    reviewed_at: null,
    created_at: new Date(row.submittedAt).toISOString(),
  }));
}

/** The seeded annotations, in the shape `GET /annotations?envelope=true` returns. */
export function seededApiAnnotations() {
  return ADMIN_ANNOTATIONS.map((row, index) => ({
    id: row.id,
    session_id: `fg-${String(index + 1).padStart(3, "0")}`,
    task: "asr" as const,
    status: row.status,
    annotator_id: `an-${index}`,
    revision: 1,
    is_gold: false,
    version: 1,
    created_at: new Date(row.claimedAt).toISOString(),
    updated_at: new Date(row.claimedAt).toISOString(),
  }));
}

/** The seeded focus groups, in the shape `GET /focus-groups` returns. */
export function seededApiSessions() {
  return ADMIN_SESSIONS.map((row) => ({
    id: row.id,
    intern_id: `in-${row.id}`,
    topic: row.topic,
    language_variety: null,
    duration_seconds: row.durationSec || null,
    has_audio: row.hasAudio,
    participant_count: row.participants,
    turn_count: row.turns,
    created_at: new Date(row.createdAt).toISOString(),
  }));
}

/** The seeded bank, in the shape `GET /prompts?envelope=true` returns. */
export function seededApiBank() {
  return BANK_ITEMS.slice(0, 20).map((item) => ({
    id: item.id,
    text: item.text,
    language_variety:
      item.variety === "Nigerian Pidgin"
        ? ("nigerian_pidgin" as const)
        : ("nigerian_english" as const),
    category: item.category,
    used_by_count: item.usedByCount,
    is_active: item.isActive,
    created_by: null,
    created_at: new Date(item.createdAt).toISOString(),
  }));
}
