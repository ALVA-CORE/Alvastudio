import { apiFetch } from "./client";

/**
 * The admin overview.
 *
 * Stuck work carries an age, not just a count: "three items stuck" and "three
 * items stuck for a month" call for different reactions, and only the second
 * is an emergency. Nothing counts as stuck until it has waited three days.
 */

export type ApiStuckWork = {
  count: number;
  oldest_at: string | null;
  oldest_age_days: number | null;
};

export type ApiDailyActivity = { date: string; count: number };

export type ApiAdminDashboard = {
  users_by_role: Record<string, number>;
  total_recordings: number;
  total_focus_group_sessions: number;
  total_annotations: number;
  recording_status: Record<string, number>;
  annotation_status: Record<string, number>;
  stuck_unreviewed_recordings: ApiStuckWork;
  stuck_unclaimed_sessions: ApiStuckWork;
  stuck_annotations_in_rework: ApiStuckWork;
  activity_window_days: number;
  daily_activity: ApiDailyActivity[];
  recordings_in_window: number;
};

export const adminDashboard = () => apiFetch<ApiAdminDashboard>("/dashboard/admin");
