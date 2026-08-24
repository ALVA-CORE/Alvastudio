# Annotation Workspace

The editor at `/annotator/sessions/:sessionId` where annotators work a
focus-group recording: correcting the ASR transcript, assigning speakers, and
trimming segment boundaries against the audio.

---

## 1. Where it sits

| | |
| --- | --- |
| Route | `/annotator/sessions/:sessionId` |
| Guard | `RoleRoute roles={["annotator", "admin"]}` |
| Shell | **Outside** `AppShellLayout` |
| Entry | Clicking any row in the sessions table |

The workspace is deliberately outside the app shell. It is a full-bleed editor
with its own header and back link, and the timeline wants every pixel of
horizontal room, so the nav sidebar would be redundant and expensive. It is
still role-guarded.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────┐
│  ←            [ undo ] [ redo ]            ● Saved       │  header (sticky)
├──────────────────────────────────────────┬───────────────┤
│  🙂 Speaker A ⌄ │ ┃ │ 15.22                │               │
│                 │   │ read-along text      │   session     │
│                 │   │ 18.04                │   metadata    │
│                 │   │ ⇕  +   ← boundary    │   panel       │
├──────────────────────────────────────────┤ (collapsible) │
│ Speakers +  │ ruler ──────────────────    │               │
│ ⠿ 🙂 A ⋮    │ ▓▓▓▓        ▓▓▓▓▓▓          │               │
│ ⠿ 🙂 B ⋮    │       ▓▓▓▓▓▓       ▓▓▓      │               │
│ [zoom] │ 1.0x (▶)          Add segment    │               │
└──────────────────────────────────────────┴───────────────┘
```

Three fixed bands. Only the transcript scrolls — an editor where the transport
can scroll out of reach is unusable.

---

## 3. Domain model

A transcript is a list of **segments**. A segment is a span of audio owned by one
speaker. Multiple speakers' segments coexist on the same timeline, which is why
the timeline is multitrack.

```ts
type Segment = {
  id: SegmentId;
  start: number;      // seconds
  end: number;
  speakerId: SpeakerId;
  text: string;
};

type TranscriptDoc = {
  sessionId: string;
  segments: Segment[];
  speakers: Speaker[];
};
```

### The invariant that everything depends on

**Segments are sorted. Overlap is per-row, not global.**

Two people talking at once is ordinary in a focus group, so segments may overlap
*across* speakers. One person saying two things at once is not, so they may never
overlap *within* a speaker's row. `retimeSegment` therefore clamps against the
nearest neighbours **on the same row**, and `moveSegmentToSpeaker` refuses a drop
that would collide on the destination row.

Sort order is load-bearing: `findActiveSegmentIndex` binary-searches by `start`.
Because rows now move independently, a retime can carry a segment past one on
another row, so **`retimeSegment` always re-sorts** — it used to get ordering for
free from the no-overlap rule. With overlaps the search also cannot stop at the
first candidate, so it finds the insertion point in O(log n) and walks backwards,
bounded by how many voices overlap at one instant.

Every timing mutation therefore routes through **one** function —
`retimeSegment` in [src/lib/annotation/segments.ts](src/lib/annotation/segments.ts) —
which clamps to `[0, duration]`, refuses to cross either neighbour (respecting
`MIN_SEGMENT_GAP`), and enforces `MIN_SEGMENT_DURATION`. Nothing else may write
`start`/`end`. The seeded mock data is asserted against these invariants in
[transcripts.test.ts](src/data/annotators/__tests__/transcripts.test.ts).

### Conformance

Subtitle limits are the Netflix Timed Text Style Guide values, not invented
ones, so a transcript that passes here passes downstream:

| Rule | Value | Severity |
| --- | --- | --- |
| Characters per line | 42 | error |
| Lines per segment | 2 | error |
| Reading speed | 17 cps | warning |
| Minimum duration | 5/6 s | error |
| Maximum duration | 7 s | warning |

The per-line `39/42` counters in the transcript come from `validateSegment`.

---

## 3b. Tagging

Implements the span taxonomies in `alva_schema_v2.json`. Nothing in the picker
is invented — a value an annotator can choose that the schema rejects is a row
that fails validation on export, which is worse than not offering it. There is a
test that pins each family's values against the schema's enums verbatim.

### Token addressing

Every span in the schema is addressed by **token index**, and the ranges are
**inclusive on both ends, zero-indexed** — a single-token span has
`startToken === endToken`. Indices are **document-global**, defined against
`transcript_verbatim` (the whole clip), not per segment.

`tokens.ts` owns that mapping. The index is derived from the live segments on
every edit rather than cached, because one extra word in an early segment shifts
every downstream index — there is a test for exactly that.

### The four span families

| Family | Schema `$def` | Hue |
| --- | --- | --- |
| Language | `languageSpan` | blue |
| Disfluency | `disfluency` | amber |
| Untranscribable | `untranscribableSpan` | pink |
| Pidgin construction | `pcmConstructionTag` | violet |

Plus `nonSpeechEvent` (teal), which is anchored to a **single token** rather than
a range — the schema is explicit that the annotator supplies `at_token` only, and
`start_sec`/`end_sec` are filled later by the forced aligner. Nothing in the UI
asks for waveform scrubbing to place one.

One hue per *family*, not per value: the eye learns four categories rather than
thirty, and values are told apart by their label in the picker.

In the transcript a tag is a **background wash only** — no rule, no fill. Tagged
tokens are grouped into contiguous runs so the whitespace *between* them sits
inside the wash; rendering per token leaves the gaps uncoloured and a tagged
phrase reads as a row of separate chips rather than one highlighter stroke.
Where spans overlap the most recent one wins outright rather than the washes
blending, because two tints compounded produce a muddy third colour belonging to
neither family — the panel is where overlaps are read precisely.

On the **timeline**, a tagged clip carries one dot per family in its top-right
corner. That is the glance-level view: which clips have been worked, without
opening any of them.

**Pidgin constructions are defined but withheld from the menu.** The schema notes
its starter values "need ratification by a linguist before any annotation round
uses them", so `SPAN_FAMILIES` (render + validate) includes the family and
`TAG_FAMILIES` (the picker) does not. A document that already carries one still
displays and validates.

### Interaction

Two paths, deliberately:

- **Precise** — highlight words in a segment and a tag control appears beneath it.
  This is the only way to tag a sub-phrase.
- **Batch** — Shift-click clips on the timeline, then pick a tag from the panel's
  **Tags** tab. A clip selection can only honestly describe a segment's *full*
  token range, so that is what it applies.

Selection is driven by the document's `selectionchange` event, not a `mouseup` on
the paragraph. A drag that ends outside the paragraph — most of them, since you
overshoot the last word — never fires mouseup there at all, and mouseup lands
before the selection settles in WebKit. The row's click-to-edit is also guarded
against a live selection: without it, finishing a highlight swapped the row to a
textarea and unmounted the tag control before it could be used.

Selection state lives in `selectedSegmentIds` — a set, so single-select is a set
of one and there is one code path rather than two that drift. It is transient:
undo rewinds the document, never what was highlighted.

Clip-level schema fields — `difficulty_flags` (an array, because the schema notes
heavy accent and heavy noise co-occur constantly) and `speech_present` (so a human
can overrule the automated gate in either direction) — live in that tab too.

All tagging is part of the document, so it is undoable and autosaves like any
other edit.

---

## 4. State

`src/lib/annotation/` is the core. It has no dependency on the components.

| File | Role |
| --- | --- |
| `types.ts` | Domain types + conformance constants |
| `segments.ts` | Pure segment maths — formatting, validation, search, retime, split, merge |
| `history.ts` | Generic snapshot undo/redo with explicit coalescing |
| `autosave.ts` | Debounced save controller with a status machine |
| `store.ts` | zustand vanilla store |
| `context.tsx` | React bindings + autosave wiring |

### The split that matters

`history` holds the **document** and is undoable. Everything else — playhead,
zoom, selection, save status — is transient and deliberately **not** undoable.

> Rewinding the tape is not an edit. Ctrl+Z must never move the playhead.

There is a test asserting exactly this.

### Coalescing

Typing emits one commit per keystroke, keyed `text:<segmentId>`. Consecutive
same-key commits collapse into one undo step, so Ctrl+Z rewinds a whole edit
rather than a letter. Keying on the *target* rather than a timer means moving to
another segment always starts a new step, however fast someone types.

Drags work the same way: `retime(id, next, { live: true })` while the pointer
moves, then `endInteraction()` on release. One gesture, one undo step.

### Autosave

```
idle ──schedule──▶ dirty ──(1.2s quiet)──▶ saving ──ok───▶ saved
                     ▲                       │
                     │                       ├─offline──▶ offline ──online──▶ dirty
                     └──edit during save─────┘
                                             └─fail─────▶ error ──(backoff)──▶ saving
```

Written as a plain controller, not a hook, so the whole lifecycle is testable
with fake timers and no renderer. Bounded exponential-backoff retry, in-flight
coalescing, and a `pagehide` flush so a closing tab does not drop keystrokes.

---

## 5. Performance

`currentTime` changes ~60×/s during playback. This is the constraint that shapes
the component tree.

1. **Nothing large subscribes to `currentTime`.** Handlers that merely *need* the
   time read it from `store.getState()` instead of subscribing.
2. **The playhead is moved imperatively** — a `store.subscribe` callback writes
   `style.transform` and the timestamp label's `textContent`. It renders zero
   React components per frame.
3. **Rows and clips are `memo`'d and receive primitives only.** `isActive` is
   derived by the parent and passed as a boolean.
4. **The transcript is virtualised** with `@tanstack/react-virtual`, keyed by
   segment id so a measured height follows its segment through inserts.

---

## 6. The timeline

`src/components/annotators/workspace/timeline/`

One lane per speaker, segments as clips. Video-editor shape, because the job is
a video editor's — the annotator is reading who spoke when across parallel
voices, which a single merged waveform cannot express.

- **Header column** is `position: sticky` inside the same scroller as the lanes,
  so names stay put on horizontal scroll with no scroll-sync code.
- **Speaker rows** reorder by native HTML5 drag (keyboard-accessible drop targets
  for free). Clips use pointer events, which need pixel precision.
- **Clips** drag to move and trim from either edge, snapping to any segment edge
  within 6px. Pointer capture is taken on the element, so a fast drag that
  outruns the cursor still delivers moves to the right handler.
- **The ruler is a draggable scrubber**, and so is the playhead itself — it
  carries a 16px-wide transparent grab strip down its entire length, because a
  1px line is not a hit target anyone can find. Playhead drags measure against
  the scroller's lane origin rather than the handle's own rect, since the handle
  is a moving target mid-drag.
- **The playhead** carries its own timestamp badge on the ruler — which is why
  there is no time readout in the transport row. The line renders at `z-[5]`,
  below both the sticky speaker column (`z-[6]`) and the ruler (`z-[7]`), so the
  scrubber slides underneath the names. The badge **cannot live in that layer**
  for the same reason — the ruler's own background paints straight over it — so
  it is rendered inside the ruler row at `z-[9]` and driven by the same
  imperative transform.
- **A seek reveals itself.** At 40px/s, 22 seconds in is 880px off-screen;
  without an auto-scroll the store updates, the playhead moves, and the
  annotator sees nothing happen. Jumps larger than 0.5s scroll the playhead back
  into view; frame-by-frame playback does not, or it would fight the user's own
  horizontal scrolling.
- **Zoom writes are rAF-coalesced** and the slider shows the current scale
  (`26px/s`) while dragging. The slider fires per pointer-pixel, faster than a
  frame, and each write re-lays out every lane.
- **The dock is sized to the tracks that exist.** A two-speaker session reserves
  two lanes, not four — and the ceiling drops with the roster, so the panel can
  never be dragged open onto empty space.
- **It is resizable** by the handle on its top edge (`useResizableHeight`). The
  hook takes a live `preferred` height and follows it until the user drags,
  after which the height is theirs and is only clamped when the bounds move
  under it — adding a speaker must not silently undo an explicit choice. It
  clamps rather than floors, so it can never be dragged past its own ruler: a
  timeline with no visible time is not a smaller timeline, it is a broken one.
  Arrow keys nudge it. When shrunk, the tracks scroll vertically *inside* the
  dock, between the ruler and the transport, so the controls never leave.
- **The horizontal scrollbar is a control.** It gets its own 10px gutter and a
  heavier thumb (`.alva-timeline-scrollbar`) rather than the 4px hairline used
  elsewhere — 4px is not grabbable with a mouse.

### Layer order

Nothing may cover the speaker column. Top to bottom:

| Layer | z | Why |
| --- | --- | --- |
| Ruler header cell | `z-[8]` | Above the playhead badge beside it |
| Ruler row | `z-[7]` | Sticky over the tracks on vertical scroll |
| Speaker row headers | `z-[6]` | Above the playhead line |
| Playhead line | `z-[5]` | Above the lanes, under the speaker column |
| Playhead badge | `z-[1]` | Inside the ruler row — above its ticks, under its header cell |
- **Clips are windowed** to the visible time range plus 8s of padding. A
  40-minute session has ~430 segments; rendering all of them made zoom feel like
  mud. Scroll and resize writes are rAF-coalesced.
- **The roster is unbounded.** Labels run A…Z then AA, AB — spreadsheet-column
  style, because "Speaker 27" stops reading as a name. Deleting a speaker removes
  their segments too, and never removes the last one — that would orphan every
  segment.
- **Clips drag vertically between rows.** Vertical travel rounds to whole rows so
  a slightly-off horizontal drag never changes speaker by accident. The row change
  is **previewed, not applied**, while the pointer is held — the destination lane
  lights up and the move lands on release. Committing mid-drag made the clip jump
  out from under the cursor and re-parent on every pixel of vertical wobble. The
  store still rejects the drop if that row is busy in the target span.
- **Playback page-scrolls, it does not centre.** Centring on every exit pins the
  playhead mid-view while the waveform slides underneath. Both seeks and playback
  scroll smoothly, but the scroll is **latched**: a smooth scroll takes a few
  hundred ms during which `scrollLeft` is still the old value, so the exit test
  stays true and — unguarded — the animation restarts every frame and never
  arrives. That is exactly why the playhead used to crawl off-screen and only
  reappear on pause. The latch clears once the scroller is within a pixel of its
  target.
- **Zoom** sits under the speaker header column, lined up with what it scales.

### Two documented placeholders

Both are isolated behind one function each, so replacing them touches nothing
else:

1. **Waveforms are synthesised, not decoded** (`peaks.ts`). Each clip gets a
   deterministic speech-shaped envelope from a hash of its segment id. Replace
   with server-side peak extraction; the timeline only ever consumes `number[]`
   in `0..1`.
2. **The transport clock is rAF-driven, not audio-driven** (`useTransport.ts`).
   The seeded demo audio is 9–14s while the sessions it stands in for run
   18–47 minutes, so the audio cannot be the clock — it loops underneath as
   audible feedback. With real session-length audio, read `audio.currentTime` in
   `tick` instead of accumulating.

---

## 7. Colour discipline

The design system allows one accent-filled element per viewport. Here it is the
**play button**. Speaker colours are the sanctioned exception — voices must be
told apart — but they are rationed:

| Surface | Speaker colour |
| --- | --- |
| Avatar disc | Yes, tinted to 26% |
| Timeline clip | Yes, tinted 22% / 38% selected |
| Transcript rail | Line is constant; focus adds a faded aura (18%) and lifts the line to 70% |
| Timestamps | Never |
| Transcript text | Never |

The reading surface stays monochrome so a page with eight speakers reads as a
document rather than a paint chart.

---

## 8. States

| State | Component |
| --- | --- |
| Loading | `WorkspaceSkeleton` — the real silhouette, `alva-shimmer`, never a spinner |
| Empty | `WorkspaceEmpty` — ASR produced nothing; start manually |
| Error | `WorkspaceError` — retry + back |
| Not found | `WorkspaceNotFound` — bad `:sessionId` |
| Mobile | `AnnotatorMobileGate` — annotation is desktop work |
| Audio failure | Inline banner; the timeline stays usable, just silent |

`useSessionTranscript` returns a discriminated union, so the page cannot render
an impossible combination — there is no way to be loading *and* errored.

---

## 9. Keyboard

| Key | Action |
| --- | --- |
| `Space` | Play/pause (ignored inside a text field) |
| `←` / `→` | Seek ∓2s (`Shift` for 5s) |
| `⌘Z` / `Ctrl+Z` | Undo — works inside textareas too |
| `⇧⌘Z` / `Ctrl+Y` | Redo |
| `⌘S` | Flush autosave |
| `Delete` / `Backspace` | Delete the selected segment (from either surface) |
| `Esc` | Clear speaker focus and selection |
| `⌘Enter` | Split segment at the caret |
| `Backspace` at pos 0 | Merge with previous |

---

## 10. Testing

```bash
npm test              # 337 tests
npm run test:watch
npm run test:coverage
```

| Suite | Covers |
| --- | --- |
| `segments.test.ts` | Formatting, validation, binary search vs linear scan, retime clamping, split/merge |
| `history.test.ts` | Coalescing, redo invalidation, cap eviction order |
| `autosave.test.ts` | Debounce, in-flight coalescing, offline hold, backoff retry |
| `store.test.ts` | Undo grouping, **playback untouched by undo**, selection lifecycle |
| `transcripts.test.ts` | Mock data holds the sort/overlap/bounds invariants |
| `workspace.test.tsx` | The editor mounts, speakers add/delete, Delete removes a segment, undo restores it |
| `useResizableHeight.test.ts` | Drag inversion, clamping, origin-anchored gestures, keyboard nudge |
| `bento.test.tsx` | Dashboard charts mount against real datasets |

Two harness notes in `src/test/setup.ts` worth knowing:

- jsdom reports every element as 0×0, which makes `react-virtual` render **zero**
  rows. The setup gives elements a 1280×800 box so virtualised lists are testable.
- jsdom implements no Web Audio; `AudioContext` and the `HTMLMediaElement`
  transport methods are stubbed.

---

## 11. Swapping in the real backend

Everything mock lives behind four functions in
[src/data/annotators/transcripts.ts](src/data/annotators/transcripts.ts):

| Function | Replace with |
| --- | --- |
| `getTranscript(session)` | `GET /sessions/:id/transcript` |
| `saveTranscript(doc)` | `PUT /sessions/:id/transcript` |
| `buildTranscript(session)` | *(delete — generator only)* |
| `segmentPeaks(id, n)` | A slice of the server's peaks file |

The shape those return **is** the contract. No component changes.


---

## 12. What was removed, and why

**Second-pass agreement** is gone from the whole codebase — the type, the
dashboard gauge, the metric card, the sessions column and the sidebar row.
Annotators never double-review the same audio, so there is no second pass for a
first one to agree with. Keeping the field would have meant a number that could
only ever be `null`.


---

## 13. Transcript row anatomy

```
🙂 Speaker A ⌄  │┃│  15.22
                │┃│  We are recording this, and your name will
                │┃│  not be attached to anything you say.
                │┃│  18.04
                      ⇕  +          ← boundary element
```

- **Speaker gutter** — the *avatar* opens the speaker picker (which ticks the
  current speaker rather than showing a radio dot); the *name* renames on
  double-click. Splitting them means reading who is speaking never risks opening
  a menu by accident.
- **Rail** — the line never changes width or colour. Selection is expressed only
  as a faded aura hugging it, so scrolling has no jitter from lines thickening.
  Clicking the rail selects the segment *and* moves the playhead to it; `Delete`
  removes it, `Escape` deselects.

  The lit rail tracks **selection only**, never playback. Tying it to the
  playhead too would make `Escape` appear to do nothing — the segment you just
  clicked is also the one the playhead moved to, so clearing the selection would
  leave the rail lit. Where playback has reached is shown by the read-along text.
- **Both timecodes** are clickable and seek. The end time is not redundant with
  the next start once segments have real silence between them.
- **Read-along text** — muted by default, each word lifting to foreground as the
  playhead passes it. Clicking swaps the display for a textarea, because a
  textarea cannot carry per-word styling.
- **Boundary** — merge (always visible, no fill until hover) and insert (hover
  only), side by side, aligned under the rail. These are *boundary* actions, not
  segment actions: merge joins the rows either side, insert drops into the
  silence between them. Hanging them off a row would misstate what they act on.

### Scrolling

One effect owns the scroll position, not two. Selection and playback both want
to bring a row into view, and when they disagree — a click seeks *and* selects,
firing both — two competing `scrollToIndex` calls land in the same frame and the
list visibly stutters. The effect resolves a single target index first
(selection if any, else the playhead's segment while following), so every move
is one smooth scroll. Guarded on the index changing, so typing never yanks the
scroll position out from under the caret.

The scroll itself does **not** go through `virtualizer.scrollToIndex(...,
{ behavior: "smooth" })`. That combination is documented as unsupported
alongside dynamic measurement, and this list measures every row — the animation
and the re-measure fight each other, which is the stutter. The offset is
resolved with `getOffsetForIndex` and handed to the scroller's own native smooth
scroll instead.

Past `SMOOTH_SCROLL_LIMIT` (1200px) the scroll lands instantly rather than
animating. Animating across thousands of pixels is not smooth — every row
entering the viewport measures itself mid-flight, which is exactly what makes a
long jump stutter.

### Save status

One glyph in one position through the whole cycle: a steady green dot at rest,
the same dot spinning while a write is in flight. The label settles into relative
time — the useful question minutes later is *how stale is this*, not *did it
work*.
