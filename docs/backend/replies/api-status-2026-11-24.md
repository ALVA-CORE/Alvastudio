# Frontend handoff: 24 Nov, word timings, shorter segments, diarization

Received 24 Nov 2026; wired 24 Nov. Checked against the `openapi` artifact
for origin/main `ffa4495`.

Asks live in [`endpoints-needed.md`](../endpoints-needed.md), never here.

## What we did with it

| Section | Our handling |
| --- | --- |
| 1 Read-along | Each segment keeps its tokens' `start_sec`/`end_sec`. The highlight lights the word whose time holds the playhead, and spreads evenly only over words with no time, or once an edit has changed the segment's word count. |
| 2 Edited words | A splice sends a changed word with no time, so the server times it between its neighbours. An unchanged word keeps the time it was read with. The sidebar's Audio group shows "Word timings": Exact (`done`), Being made exact (`pending`, `processing`), or Estimated (anything else). |
| 3 Shorter segments | Nothing to change: segments are read from their tokens, and linking a speaker label already sets every segment carrying it. |
| 4 Diarization | Nothing to change. |
| 5 Admins | Admin → Annotations → Tools: "Split untouched drafts again" and "Get exact word timings". Each one previews first (the counts, and the audio time ElevenLabs bills), then asks before applying. |
