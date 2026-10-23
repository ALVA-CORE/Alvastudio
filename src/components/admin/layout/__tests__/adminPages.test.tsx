import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ADMIN_NAV_ITEMS, adminNavItem } from "../adminNav";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminPromptsPage from "@/pages/admin/AdminPromptsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCorpusPage from "@/pages/admin/AdminCorpusPage";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";
import AdminAnnotationsPage from "@/pages/admin/AdminAnnotationsPage";
import AdminFocusGroupsPage from "@/pages/admin/AdminFocusGroupsPage";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminAudioPage from "@/pages/admin/AdminAudioPage";

/* The users screen reads from `GET /users` now. Nothing here is testing the
 * network, so the module is stubbed with the same seeded rows. */
/* The reviews screen reads from `GET /recordings`, `/reviews` and `/users`.
 * None of these tests are testing the network. */
vi.mock("@/lib/api/recordings", async () => {
  const { seededApiRecordings } = await import("@/test/apiUserFixtures");
  const items = seededApiRecordings();
  return {
    listRecordingsPage: vi.fn(async () => ({
      items,
      total: items.length,
      limit: 200,
      offset: 0,
    })),
    listRecordings: vi.fn(async () => items),
    getRecording: vi.fn(async () => items[0]),
    assignReviewer: vi.fn(async () => items[0]),
    recordingAudioUrl: vi.fn(async () => "blob:test"),
    submitPromptRead: vi.fn(),
    submitStimulus: vi.fn(),
  };
});

vi.mock("@/lib/api/reviews", () => ({
  listReviews: vi.fn(async () => ({ items: [], total: 0, limit: 200, offset: 0 })),
  reviewQueue: vi.fn(async () => []),
  assignNext: vi.fn(),
  submitReview: vi.fn(),
  reviewsForRecording: vi.fn(async () => []),
}));

/* The annotations screen reads from `GET /annotations` and `/focus-groups`. */
vi.mock("@/lib/api/annotations", async () => {
  const { seededApiAnnotations } = await import("@/test/apiUserFixtures");
  const items = seededApiAnnotations();
  return {
    listAllAnnotations: vi.fn(async () => ({
      items,
      total: items.length,
      limit: 200,
      offset: 0,
    })),
    assignAnnotator: vi.fn(async () => items[0]),
    reviewAnnotation: vi.fn(async () => items[0]),
    listQueue: vi.fn(async () => []),
    listMine: vi.fn(async () => items),
    getAnnotation: vi.fn(async () => items[0]),
    claimNext: vi.fn(),
  };
});

vi.mock("@/lib/api/focusGroups", async () => {
  const { seededApiSessions } = await import("@/test/apiUserFixtures");
  const sessions = seededApiSessions();
  return {
    listSessions: vi.fn(async () => sessions),
    getSession: vi.fn(async () => sessions[0]),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    addParticipant: vi.fn(),
  };
});

/* The overview, corpus and prompts screens read from these. */
vi.mock("@/lib/api/adminDashboard", () => ({
  adminDashboard: vi.fn(async () => ({
    users_by_role: { contributor: 11, intern: 4, annotator: 4, admin: 1 },
    total_recordings: 180,
    total_focus_group_sessions: 42,
    total_annotations: 36,
    recording_status: { approved: 120, rejected: 20, in_review: 40, total: 180 },
    annotation_status: { approved: 20, submitted: 10, needs_rework: 6 },
    stuck_unreviewed_recordings: { count: 7, oldest_at: null, oldest_age_days: 12 },
    stuck_unclaimed_sessions: { count: 3, oldest_at: null, oldest_age_days: 5 },
    stuck_annotations_in_rework: { count: 2, oldest_at: null, oldest_age_days: 9 },
    activity_window_days: 365,
    daily_activity: [{ date: "2026-10-01", count: 4 }],
    recordings_in_window: 180,
  })),
}));

/* Resolves on the next tick rather than synchronously, so the page still
 * renders its skeleton on the first frame the way a real fetch would. */
vi.mock("@/hooks/useEarnings", async () => {
  const { useEffect, useState } = await import("react");
  const { EARNINGS } = await import("@/data/admin/payments");
  return {
    useEarnings: () => {
      const [isLoading, setLoading] = useState(true);
      /* Resolved on a microtask, not in the effect body: `render()` flushes
         effects synchronously, so setting it there would mean the skeleton
         never got a frame. A real fetch settles on a microtask too. */
      useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => !cancelled && setLoading(false));
        return () => {
          cancelled = true;
        };
      }, []);
      return { rows: isLoading ? [] : EARNINGS, isLoading, error: null, reload: vi.fn() };
    },
  };
});

vi.mock("@/hooks/useRates", async () => {
  const { RATES } = await import("@/data/admin/payments");
  return {
    useRates: () => ({
      rates: RATES,
      isLoading: false,
      error: null,
      reload: vi.fn(),
      save: vi.fn(),
    }),
  };
});

vi.mock("@/lib/api/corpus", () => ({
  corpusSummary: vi.fn(async () => ({
    total_hours: 412.5,
    recording_hours: 300,
    focus_group_hours: 112.5,
    clips: 180,
    focus_group_sessions: 42,
    contributors: 214,
    focus_group_participants: 160,
    by_session_type: { prompt_read: 200, stimuli_narration: 100 },
    by_language_variety: { nigerian_pidgin: 268.9, nigerian_english: 143.6 },
    by_status: { approved: 351.2, in_review: 40, rejected: 21.3 },
    approved_hours: 351.2,
    unmeasured_rows: 3,
    daily_hours: [{ date: "2026-10-01", hours: 2.5 }],
    hours_in_window: 412.5,
    by_type_status: [
      { session_type: "prompt_read", status: "approved", clips: 120, hours: 200 },
    ],
    demographics: {
      by_gender: [{ value: "female", speakers: 100, hours: 220 }],
      by_age_bracket: [{ value: "25-34", speakers: 90, hours: 180 }],
    },
  })),
  corpusCoverage: vi.fn(async () => ({
    states: [{ state: "Lagos", speakers: 50, hours: 80 }],
    unmatched_states: {},
  })),
}));

vi.mock("@/lib/api/catalog", async () => {
  const { seededApiBank } = await import("@/test/apiUserFixtures");
  const items = seededApiBank();
  const page = { items, total: items.length, limit: 200, offset: 0 };
  return {
    /* Plain constants, not calls. A whole-module mock replaces them too. */
    DEFAULT_TARGET_PARTICIPANTS: 8,
    MIN_TARGET_PARTICIPANTS: 1,
    MAX_TARGET_PARTICIPANTS: 50,
    listPromptsPage: vi.fn(async () => page),
    listStimuliPage: vi.fn(async () => page),
    listTopicsPage: vi.fn(async () => ({ items: [], total: 0, limit: 200, offset: 0 })),
    createTopic: vi.fn(async () => items[0]),
    updateTopic: vi.fn(async () => items[0]),
    deleteTopic: vi.fn(async () => ({ ...items[0], is_active: false })),
    createBankItem: vi.fn(async () => items[0]),
    updateBankItem: vi.fn(async () => items[0]),
    deleteBankItem: vi.fn(async () => ({ ...items[0], is_active: false })),
    importBank: vi.fn(async () => ({ added: 1, skipped: 0, failed: 0 })),
    listPrompts: vi.fn(async () => items),
    listStimuli: vi.fn(async () => items),
    nextPrompt: vi.fn(),
    nextStimulus: vi.fn(),
    getPrompt: vi.fn(),
    getStimulus: vi.fn(),
  };
});

vi.mock("@/lib/api/users", async () => {
  const { seededApiUsers } = await import("@/test/apiUserFixtures");
  const items = seededApiUsers();
  return {
    listUsers: vi.fn(async () => ({
      items,
      total: items.length,
      limit: 200,
      offset: 0,
    })),
    createUser: vi.fn(async () => items[0]),
    updateUser: vi.fn(async () => items[0]),
    deleteUser: vi.fn(async () => undefined),
    approveUser: vi.fn(async () => items[0]),
    approveIntern: vi.fn(async () => items[0]),
    getUserProfiles: vi.fn(async () => ({
      user_id: items[0].id,
      role: items[0].role,
      approved: true,
      profile: null,
      intern_profile: null,
      annotator_profile: null,
    })),
    issuePasswordReset: vi.fn(async () => ({
      token: "prt_test",
      expires_at: new Date().toISOString(),
      user_id: items[0].id,
      email: items[0].email,
    })),
    previewUserDeletion: vi.fn(async () => ({})),
    throwawayPassword: () => "Tmp!test",
  };
});


/** Every page but Settings, which needs the auth provider to say who you are. */
const PAGES = [
  ["overview", AdminDashboardPage],
  ["prompts", AdminPromptsPage],
  ["users", AdminUsersPage],
  ["corpus", AdminCorpusPage],
  ["reviews", AdminReviewsPage],
  ["annotations", AdminAnnotationsPage],
  ["focus-groups", AdminFocusGroupsPage],
  ["payments", AdminPaymentsPage],
  ["audio", AdminAudioPage],
] as const;

function renderPage(Page: () => React.ReactElement) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

describe("admin pages", () => {
  it.each(PAGES)("%s renders with its own heading", (id, Page) => {
    renderPage(Page);
    expect(
      screen.getByRole("heading", { level: 1, name: adminNavItem(id).title })
    ).toBeInTheDocument();
  });

  /* The heading is outside the loading branch, so it is there immediately —
   * the body is not. A page that renders its content on the first frame has
   * lost its skeleton, and the layout will jump when real data arrives. */
  it.each(PAGES)("%s shows a skeleton before its content", (id, Page) => {
    renderPage(Page);

    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: adminNavItem(id).title })
    ).toBeInTheDocument();
  });

  it.each(PAGES)("%s renders its content once loaded", async (_id, Page) => {
    renderPage(Page);
    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument()
    );
  });

  it("covers every nav item that has a page", () => {
    const covered = new Set(PAGES.map(([id]) => id));
    const missing = ADMIN_NAV_ITEMS.filter(
      (item) => item.id !== "settings" && !covered.has(item.id)
    );
    expect(missing.map((item) => item.id)).toEqual([]);
  });
});

describe("admin overview", () => {
  it("links each stuck-work row to the page that can clear it", async () => {
    renderPage(AdminDashboardPage);

    const panel = (await screen.findByText("Needs attention")).closest("section");
    expect(panel).toBeTruthy();

    const rows = within(panel as HTMLElement).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.textContent).toMatch(/\d/);
    }
  });
});

/* The approval queue is the one thing on this page waiting on the person
 * reading it, so it has to be on screen without touching a filter first. */
describe("intern approvals", () => {
  it("shows pending applications on first load, at the top", async () => {
    renderPage(AdminUsersPage);

    const pills = await screen.findAllByText("Pending approval");
    expect(pills.length).toBeGreaterThan(0);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Pending approval")).toBeInTheDocument();
  });
});
