import { apiFetch } from "./client";
import type { ApiPage, ApiRecording } from "./recordings";

/**
 * Junk flags and reports (21 Nov). A flag is for a clip that isn't a real
 * attempt: it is rejected and never paid. A report is on the contributor; an
 * open one pauses their uploads, and four active flags open one by itself.
 *
 * An undecided clip is flagged with its verdict (`POST /reviews`, `flag`);
 * these routes are for an approved one, and for reports.
 */
export type ApiFlagReason =
  | "silence_or_noise"
  | "not_the_item"
  | "gibberish"
  | "wrong_language"
  | "offensive"
  | "duplicate_audio"
  | "other";

export const FLAG_REASON_LABEL: Record<ApiFlagReason, string> = {
  silence_or_noise: "Silence or noise only",
  not_the_item: "Not what it was given",
  gibberish: "Gibberish",
  wrong_language: "Wrong language",
  offensive: "Offensive content",
  duplicate_audio: "Same audio as another clip",
  other: "Another reason",
};

/** Reasons are required, each once; `other` needs a note. The note is for admins only. */
export type ApiFlagIn = { reasons: ApiFlagReason[]; note?: string };

/** `POST /recordings/{id}/flag`: an annotator on a narration they hold, an admin on an approved clip. */
export const flagRecording = (recordingId: string, body: ApiFlagIn) =>
  apiFetch<{ flag_id: string; money: "voided" | "in_flight" | "paid" | "none" }>(
    `/recordings/${recordingId}/flag`,
    { method: "POST", body }
  );

/** Admins: a flag made by mistake. The clip goes back to review. */
export const clearRecordingFlag = (recordingId: string) =>
  apiFetch<ApiRecording>(`/recordings/${recordingId}/flag/clear`, { method: "POST", body: {} });

/** Reports the clip's contributor, who is never named back. 409 while the same clip's report is open. */
export const reportContributor = (body: ApiFlagIn & { recording_id: string }) =>
  apiFetch<{ report_id: string }>("/reports", { method: "POST", body });

export type ApiReportStatus = "open" | "dismissed" | "upheld";

export type ApiReportRow = {
  id: string;
  contributor_id: string;
  contributor_name: string | null;
  contributor_email: string;
  status: ApiReportStatus;
  source: "manual" | "automatic";
  created_at: string;
  decided_at: string | null;
  decided_by_name?: string | null;
  /** Active junk flags since their last decided report. */
  active_flags: number;
  filings: number;
};

export type ApiReportDetail = ApiReportRow & {
  decision_note: string | null;
  filings_list: {
    id: string;
    reporter_name: string | null;
    reporter_role: string | null;
    recording_id: string | null;
    reasons: ApiFlagReason[];
    note: string | null;
    created_at: string;
  }[];
  flags: {
    id: string;
    recording_id: string;
    reasons: ApiFlagReason[];
    note: string | null;
    flagged_by_name: string | null;
    via: "review" | "after_approval";
    created_at: string;
    cleared_at: string | null;
  }[];
  clips: { uploaded: number; approved: number; rejected: number; flagged: number };
};

export const listReports = (status: ApiReportStatus = "open") =>
  apiFetch<ApiPage<ApiReportRow>>("/reports", { query: { status, limit: 200, envelope: true } });

export const getReport = (id: string) => apiFetch<ApiReportDetail>(`/reports/${id}`);

/** Dismiss resumes their uploads; uphold deactivates the account. A decided report is a 409. */
export const decideReport = (id: string, decision: "dismiss" | "uphold") =>
  apiFetch<ApiReportDetail>(`/reports/${id}/${decision}`, { method: "POST", body: {} });

export const reasonsText = (reasons: ApiFlagReason[]) =>
  reasons.map((reason) => FLAG_REASON_LABEL[reason] ?? reason).join(", ");
