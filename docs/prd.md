# Alva Studio — Data Collection Platform

**Status:** Draft v0.1  
**Author:** Lolu (Head of Data, Alva Core)  
**Last updated:** July 8, 2026

---

## 1. Overview

Alva Studio is Alva Core's data collection platform for building **Nigerian English** and **Nigerian Pidgin** speech datasets.

### Audiences

| Audience | Description |
|----------|-------------|
| **Contributors** | General pool producing speech data (prompt reading, solo narration) |
| **Interns / Field Researchers** | Alva Core staff running focus-group sessions and QA'ing collected audio |

### Functional areas

1. Onboarding & sign-in
2. **Prompt Reader** — read-aloud data
3. **Stimuli Narration** — solo, prompted storytelling
4. **Focus Group Capture** — intern-run, multi-speaker conversational data
5. **Dashboards** — per-contributor and per-intern
6. **Review / QA** — grading audio quality

> **Out of scope (v0.1):** Payment logic, payout pipeline, and related financial infrastructure — to be spec'd separately once the above is stable.

---

## 2. User Roles

| Role | Description |
|------|-------------|
| **Contributor** | Reads prompts and/or responds to narration stimuli. Paid per accepted unit of work (payment TBD). |
| **Intern / Field Researcher** | Runs focus-group sessions, captures conversational data via external mic, logs participant metadata, reviews/grades submitted audio. |
| **Admin** | *(Implied, not detailed here.)* Manages prompts/stimuli banks, oversees approvals, views aggregate stats. |

---

## 3. Onboarding & Sign-In

**Purpose:** Authenticate the user and capture participant metadata up front — metadata quality directly affects corpus usability (accent/dialect region, age, gender, etc.).

### Suggested sign-up fields

- Full name
- Phone number / email
- Age / age bracket
- Gender
- State of origin / state of residence
- Where you have lived for most of your life
- Where do you think has the most impact on your accent
- Native language(s)
- Level of Nigerian Pidgin fluency
- Preferred recording language variety (Nigerian English / Pidgin)
- Consent + NDPA data-use acknowledgment
- Device/mic being used (self-reported, for QA context)

**Output:** A Contributor or Intern profile record that all subsequent sessions attach to.

---

## 4. Component 1 — Prompt Reader

**What it does:** Displays a written prompt/sentence; contributor reads it aloud and records.

### Core interactions

- Text prompt displayed one at a time
- Record / stop / re-record controls
- Next / previous / skip
- Playback of own recording before submit
- Submit → sent to review queue

### Tracked per submission

Prompt ID, contributor ID, duration, timestamp, device/mic metadata, waveform/audio file.

---

## 5. Component 2 — Stimuli Narration

**What it does:** Presents an open-ended prompt designed to elicit natural, spontaneous narration (not verbatim reading).

> Example: *"Tell us about a time you had a critical network failure."*

### Core interactions

- Stimulus/topic card displayed
- Record / stop controls (longer-form than prompt reads — visible timer)
- Playback before submit
- Next / skip to a different stimulus
- Submit → review queue

**Difference from Prompt Reader:** Unscripted, longer, tagged separately in the data pipeline (spontaneous-speech vs. read-speech modeling).

---

## 6. Component 3 — Focus Group Capture *(Intern-Exclusive)*

**What it does:** A variant of the stimuli module used by interns to capture multi-speaker conversational data in focus-group settings, using an external mic.

### 6.1 Mic / Signal Monitoring

- Live waveform/activity tracker showing real-time mic input
- Visual indicator for signal detected vs. silence
- Low-signal warning (color change or alert) if input level drops below usable threshold — catches mic disconnects, distance issues, low gain

### 6.2 Participant Metadata Logging

Intern inputs metadata **per participant** in the session (not just once for themselves).

**Suggested fields:** name/ID, age, gender, role in group, speaking language variety.

> **Open decision:** Whether speaker turns are tagged live or post-hoc — must map cleanly to diarization/speaker-tagging downstream.

### 6.3 Intern Dashboard

Per intern, tracked and displayed:

- Total hours recorded
- Total number of people (participants) captured
- Demographic breakdown (age, gender) across sessions run
- *(Likely also: number of sessions, approval rate — TBD)*

---

## 7. Contributor Dashboard

Per contributor, tracked and displayed:

- Number of recordings completed
- Number of prompts read (Component 1)
- Number of hours contributed (Component 2 stimuli)
- Breakdown: approved vs. not approved
- Payment status — **placeholder only**; full pay system/pipeline TBD

---

## 8. Review & QA System

**Who uses it:** Interns, to grade submitted audio for quality before it's marked approved/rejected.

### Interface pattern

Mirrors the Prompt/Stimuli player:

- Play / pause
- Next / previous
- *(Recommend: playback speed control and jump-to-timestamp for longer files)*

### Quality questionnaire (5 questions)

1. Is the audio free of background noise/interference? *(Yes / Partial / No)*
2. Is the speech clearly audible without clipping or distortion? *(Yes / Partial / No)*
3. Does the recording match the assigned prompt/stimulus? *(Yes / Partial / No)*
4. Is the speaker's speech natural and intelligible throughout? *(Yes / Partial / No)*
5. Overall, does this recording meet the quality bar for inclusion in the corpus? *(Approve / Reject / Flag for review)*

### Output

Each recording gets a quality score/verdict, feeding into:

- Contributor approved/not-approved counts (Section 7)
- Intern session stats (Section 6.3)
- Eventually, the payment pipeline *(out of scope)*

---

## 9. Data Model *(Rough — for discussion)*

| Entity | Rough fields |
|--------|--------------|
| **User** | contributor or intern, role flag |
| **Prompt** | text, language variety, used-by-count |
| **Stimulus** | topic text, language variety, used-by-count |
| **Recording** | user_id, prompt_id or stimulus_id, session_type, audio_file, duration, timestamp, device/mic metadata, status |
| **FocusGroupSession** | intern_id, stimulus_id, participants[], duration, audio_file |
| **Participant** | session_id, name/ID, age, gender, role |
| **Review** | recording_id or session_id, reviewer_id, answers to 5 questions, verdict, timestamp |
