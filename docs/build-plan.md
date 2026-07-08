# Alva Studio — Build Plan

Minimal-page architecture. **Dark mode only.** **Mobile first.** See [design-tokens.md](./design-tokens.md) and [prd.md](./prd.md).

---

## Page map (4 routes)

| Route | Page | Who | Purpose |
|-------|------|-----|---------|
| `/` | **Auth** | All | Sign in / sign up. Multi-step onboarding wizard for metadata (Section 3 of PRD). |
| `/studio` | **Capture** | Contributor + Intern | Single recording shell with **mode switcher**: Prompt Reader · Stimuli · Focus Group (intern only). Shared record/stop/playback/submit UI. |
| `/dashboard` | **Dashboard** | All (role-aware) | Contributor stats (Section 7) or Intern stats (Section 6.3). One component, two layouts. |
| `/review` | **Review** | Intern | QA queue: audio player + 5-question form (Section 8). |

**Not separate pages:** Profile edit, settings, and payment placeholder live in dashboard drawers/sheets.

```
/  ──► onboard ──► /studio ◄──► /dashboard
                      │
                 (intern) ──► /review
```

---

## App shell (mobile-first)

```
┌─────────────────────────┐
│  Header (logo, role)    │
├─────────────────────────┤
│                         │
│   Page content          │
│                         │
├─────────────────────────┤
│  Bottom nav (4 tabs)    │  ← Studio · Dashboard · Review* · Account
└─────────────────────────┘
  * Review tab hidden for contributors
```

On `md+`, bottom nav becomes a left sidebar; review can show player + questionnaire side-by-side.

---

## Folder structure

```
src/
├── components/
│   ├── auth/          # Sign-in, onboarding steps
│   ├── dashboard/     # Stat cards, progress widgets
│   ├── icons/         # @solar-icons/react wrappers (no lucide)
│   ├── layout/        # AppShell, AppThemeProvider
│   ├── review/        # Player, QA form, queue
│   ├── shared/        # BorderBeamCard, cross-feature UI
│   ├── studio/        # Recorder, mic monitor, mode switcher
│   └── ui/            # shadcn primitives
├── pages/
│   ├── auth/          # AuthPage
│   ├── studio/        # StudioPage
│   ├── dashboard/     # DashboardPage
│   ├── review/        # ReviewPage
│   └── errors/        # NotFoundPage
├── routes/            # AppRoutes
├── hooks/
└── lib/
```

Icons: use `@/components/icons` or per-icon subpaths — never lucide, never the `@solar-icons/react` barrel.

```tsx
// ✅ Good — tree-shakeable
import Microphone3 from "@solar-icons/react/video/Microphone3";

// ❌ Bad — loads entire icon set, breaks Vite optimize deps
import { Microphone3 } from "@solar-icons/react";
```

---

## Component breakdown

### Shared

| Component | Notes |
|-----------|-------|
| `AppShell` | Bottom nav, dark bg, safe-area padding |
| `BorderBeamCard` | Wrapper around shadcn `Card` — rotate on active record, pulse on idle |
| `AudioRecorder` | MediaRecorder + waveform + timer |
| `MicMonitor` | Live level meter + low-signal alert (focus group) |
| `RoleGate` | Hides intern-only routes and nav items |

### `/studio` modes

| Mode | PRD section | Unique UI |
|------|---------------|-----------|
| Prompt | §4 | One sentence at a time, prev/next/skip |
| Stimuli | §5 | Topic card, longer timer |
| Focus Group | §6 | Mic monitor + per-participant metadata form |

### `/review`

- Reuses audio player from Capture
- `ReviewForm` — 5 radio groups + verdict
- Queue navigation: next/previous submission

---

## Tech stack (current repo)

| Layer | Choice |
|-------|--------|
| UI | React 19, Vite, TypeScript |
| Icons | `@solar-icons/react` via `@/components/icons` |
| Effects | `border-beam` (rotate + pulse) |
| Routing | React Router |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query |
| Backend | **TBD** — Supabase recommended (auth, storage for audio, Postgres) |

No AI services in v0.1. Diarization/speaker tagging is downstream.

---

## Build phases

### Phase 1 — Foundation *(now)*

- [x] Design tokens + dark theme
- [x] Schibsted Grotesk font
- [x] `border-beam` installed
- [x] App shell + routing (`/`, `/studio`, `/dashboard`, `/review`)
- [x] Folder structure + Solar icons

### Phase 2 — Auth & onboarding

- [ ] Supabase auth (phone/email)
- [ ] Onboarding wizard → `User` profile
- [ ] Role assignment (contributor vs intern)

### Phase 3 — Capture

- [ ] `AudioRecorder` + upload to storage
- [ ] Prompt Reader flow
- [ ] Stimuli Narration flow
- [ ] Focus Group + mic monitor + participant logging

### Phase 4 — Dashboard & review

- [ ] Role-aware dashboard stats
- [ ] Review queue + QA questionnaire
- [ ] Approval/rejection → update contributor counts

---

## Border Beam usage guide

```tsx
import { BorderBeam } from "border-beam";
import { Card } from "@/components/ui/card";

// Traveling glow — active recording
<BorderBeam size="md" colorVariant="mono" theme="dark" strength={1}>
  <Card>...</Card>
</BorderBeam>

// Breathing inner glow — idle / waiting for mic
<BorderBeam size="pulse-inner" colorVariant="mono" theme="dark">
  <Card>...</Card>
</BorderBeam>

// Outward halo — warning (low signal) or success
<BorderBeam size="pulse-outside" colorVariant="mono" theme="dark" strength={0.9}>
  <Card>...</Card>
</BorderBeam>
```

Use sparingly: one beam per screen focus area to keep the app feeling premium, not noisy.
