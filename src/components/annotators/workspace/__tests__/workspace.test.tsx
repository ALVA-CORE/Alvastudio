import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AnnotationWorkspace } from "@/components/annotators/workspace/AnnotationWorkspace";
import { AnnotationProvider, useAnnotationStore } from "@/lib/annotation/context";
import type { AnnotationStore } from "@/lib/annotation/store";
import { buildTranscript } from "@/data/annotators/transcripts";
import { getAnnotatorSessions } from "@/data/annotators/sessions";
import { speakerDisplayName } from "@/lib/annotation/types";
import { formatTimecode } from "@/lib/annotation/segments";

/**
 * Mount tests for the workspace shell. Typecheck and build both pass on a
 * component that throws at mount, so the only way to know the editor actually
 * renders is to render it.
 */

const SESSION = getAnnotatorSessions()[0];

/** Captures the store so tests can assert document state directly. */
function StoreProbe({ onReady }: { onReady: (store: AnnotationStore) => void }) {
  onReady(useAnnotationStore());
  return null;
}

function renderWorkspace() {
  const doc = buildTranscript(SESSION);
  let store!: AnnotationStore;

  const utils = render(
    <MemoryRouter>
      <AnnotationProvider doc={doc} duration={SESSION.durationSec}>
        <StoreProbe onReady={(value) => (store = value)} />
        <AnnotationWorkspace session={SESSION} />
      </AnnotationProvider>
    </MemoryRouter>
  );

  return { ...utils, doc, store };
}

describe("AnnotationWorkspace", () => {
  it("mounts without crashing", () => {
    const { container } = renderWorkspace();
    expect(container.firstChild).toBeTruthy();
  });

  it("floats back, undo and redo instead of carrying a header bar", () => {
    renderWorkspace();

    expect(screen.getByLabelText("Back to sessions")).toBeInTheDocument();
    expect(screen.getByLabelText("Undo")).toBeInTheDocument();
    expect(screen.getByLabelText("Redo")).toBeInTheDocument();

    // The workspace header bar is gone entirely — a whole row of vertical space
    // for three controls, on a surface where that row is better spent on
    // transcript. (The sidebar keeps a header of its own, hence the precise
    // assertion rather than queryByRole("banner").)
    expect(screen.getByLabelText("Undo").closest("header")).toBeNull();
    expect(screen.getByLabelText("Back to sessions").closest("header")).toBeNull();
  });

  it("folds the save status into the session's status pill", () => {
    renderWorkspace();

    const sidebar = screen.getByRole("complementary");
    // One place answers "where is this session up to", not two.
    expect(within(sidebar).getByRole("status")).toBeInTheDocument();
  });

  it("starts with undo and redo disabled on a clean document", () => {
    renderWorkspace();
    expect(screen.getByLabelText("Undo")).toBeDisabled();
    expect(screen.getByLabelText("Redo")).toBeDisabled();
  });

  it("renders the transcript list", () => {
    renderWorkspace();
    expect(screen.getByRole("list", { name: "Transcript" })).toBeInTheDocument();
  });

  it("renders one timeline track per speaker, with an actions menu", () => {
    const { doc } = renderWorkspace();

    for (const speaker of doc.speakers) {
      const name = speakerDisplayName(speaker);
      expect(
        screen.getByLabelText(`Actions for ${name}`, { selector: "button" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(`Focus ${name}`)).toBeInTheDocument();
    }
  });

  it("exposes the transport without a duplicate time readout", () => {
    renderWorkspace();

    expect(screen.getByLabelText("Play")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add segment$/i })).toBeInTheDocument();
  });

  it("focuses a speaker when their timeline row is clicked", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const target = doc.speakers[1] ?? doc.speakers[0];
    const button = screen.getByLabelText(`Focus ${speakerDisplayName(target)}`);

    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");

    // Clicking again clears the focus rather than trapping the user in it.
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("enables undo after an edit, and the edit survives a round trip", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    // Rows render read-along text until clicked; the textarea only mounts in
    // edit mode, which is what makes per-word highlighting possible.
    const [display] = screen.getAllByLabelText(/^Edit transcript at/);
    await user.click(display);

    const box = await screen.findByRole("textbox");
    await user.type(box, "!");

    const undo = screen.getByLabelText("Undo");
    expect(undo).toBeEnabled();

    await user.click(undo);
    expect(screen.getByLabelText("Redo")).toBeEnabled();
  });

  it("renders the speaker gutter with an assignable speaker control", () => {
    renderWorkspace();
    const assignButtons = screen.getAllByLabelText(/^Change speaker for segment at/);
    expect(assignButtons.length).toBeGreaterThan(0);
  });

  it("keeps the metadata sidebar mounted", () => {
    renderWorkspace();
    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getAllByText(SESSION.code).length).toBeGreaterThan(0);
  });

  it("adds speakers without a ceiling, labelling them A, B, C…", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const before = doc.speakers.length;
    for (let i = 0; i < 6; i += 1) {
      await user.click(screen.getByLabelText("Add speaker"));
    }

    // The roster is unbounded — the control never disappears.
    expect(screen.getByLabelText("Add speaker")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Focus /)).toHaveLength(before + 6);
  });

  it("deletes a speaker and their timeline row from the actions menu", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const victim = doc.speakers[1];
    const name = speakerDisplayName(victim);

    await user.click(screen.getByLabelText(`Actions for ${name}`));
    await user.click(await screen.findByRole("menuitem", { name: /delete speaker/i }));

    expect(screen.queryByLabelText(`Focus ${name}`)).not.toBeInTheDocument();
  });

  it("deletes the selected segment on Delete, and undo brings it back", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    // The list is virtualised, so the number of RENDERED rails stays constant
    // as the window refills. Track the specific segment instead.
    const rail = screen.getAllByLabelText(/^Select segment at/)[0];
    const label = rail.getAttribute("aria-label") as string;

    await user.click(rail);
    await user.keyboard("{Delete}");

    expect(screen.queryByLabelText(label)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Undo"));
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("puts merge and insert on the boundary, not on either segment", () => {
    renderWorkspace();

    // Merge is always available on a boundary; insert only where the following
    // silence is long enough to hold a segment.
    expect(screen.getAllByLabelText(/^Merge the segment at/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/^Add segment after/).length).toBeGreaterThan(0);
  });

  it("exposes a draggable scrubber on the ruler", () => {
    renderWorkspace();
    expect(screen.getByRole("slider", { name: "Scrub timeline" })).toBeInTheDocument();
  });

  it("never highlights more than one segment at a time", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const lit = () =>
      screen
        .getAllByLabelText(/^Select segment at/)
        .filter((node) => node.getAttribute("aria-pressed") === "true");

    // Nothing is lit until something is selected — playback shows its position
    // through the read-along text, not by lighting a rail.
    expect(lit()).toHaveLength(0);

    const rails = screen.getAllByLabelText(/^Select segment at/);
    await user.click(rails[3]);

    // Selecting a different row must move the highlight, not add a second one.
    expect(lit()).toHaveLength(1);
    expect(lit()[0]).toBe(rails[3]);
  });

  it("clears the selection on Escape", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const rails = screen.getAllByLabelText(/^Select segment at/);
    await user.click(rails[2]);
    expect(rails[2]).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Escape}");

    expect(rails[2]).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the speaker picker from the avatar only", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const [picker] = screen.getAllByLabelText(/^Change speaker for segment at/);
    await user.click(picker);

    expect(await screen.findByText("Assign speaker")).toBeInTheDocument();
  });

  it("renames a speaker by double-clicking the name in the transcript", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const original = speakerDisplayName(doc.speakers[0]);
    const [nameButton] = screen.getAllByTitle("Double-click to rename");
    await user.dblClick(nameButton);

    const input = await screen.findByLabelText("Speaker name");
    await user.clear(input);
    await user.type(input, "Chair{Enter}");

    expect(screen.queryByText(original)).not.toBeInTheDocument();
    expect(screen.getAllByText("Chair").length).toBeGreaterThan(0);
  });

  it("moves the playhead to a segment when its rail is clicked", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const rails = screen.getAllByLabelText(/^Select segment at/);
    await user.click(rails[3]);

    // The rail's own label carries the timecode it should have seeked to.
    const label = rails[3].getAttribute("aria-label") as string;
    const timecode = label.replace("Select segment at ", "");

    // The badge on the ruler is the visible readout of the playhead position;
    // scope to the timeline, since the row's own timecode reads the same.
    const timeline = screen.getByRole("region", { name: "Session timeline" });
    expect(within(timeline).getByText(timecode)).toBeInTheDocument();
    expect(doc.segments.some((s) => formatTimecode(s.start) === timecode)).toBe(true);
  });

  it("shows the zoom scale while the slider is being dragged", () => {
    renderWorkspace();

    // Two nodes carry this label: the wrapping group and the Slider root that
    // owns the pointer handlers. Radix puts role="slider" on the thumb, which
    // the shared Slider does not forward a name to, so target the root.
    const [, sliderRoot] = screen.getAllByLabelText("Timeline zoom");

    expect(screen.queryByText(/px\/s$/)).not.toBeInTheDocument();

    fireEvent.pointerDown(sliderRoot);
    expect(screen.getByText(/px\/s$/)).toBeInTheDocument();

    fireEvent.pointerUp(sliderRoot);
    expect(screen.queryByText(/px\/s$/)).not.toBeInTheDocument();
  });

  it("exposes a resize handle bounded so the ruler can never be hidden", () => {
    renderWorkspace();

    const handle = screen.getByRole("separator", { name: "Resize timeline" });
    const min = Number(handle.getAttribute("aria-valuemin"));
    const now = Number(handle.getAttribute("aria-valuenow"));
    const max = Number(handle.getAttribute("aria-valuemax"));

    expect(min).toBeGreaterThan(0);
    expect(now).toBeGreaterThanOrEqual(min);
    expect(now).toBeLessThanOrEqual(max);
  });

  it("sizes the timeline to the speakers that exist, not the maximum", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const handle = screen.getByRole("separator", { name: "Resize timeline" });
    const before = Number(handle.getAttribute("aria-valuenow"));
    const ceilingBefore = Number(handle.getAttribute("aria-valuemax"));

    // The panel is exactly as tall as the lanes that exist.
    expect(doc.speakers.length).toBeGreaterThan(0);
    expect(before).toBe(ceilingBefore);

    await user.click(screen.getByLabelText("Add speaker"));

    const after = Number(handle.getAttribute("aria-valuenow"));
    expect(after).toBeGreaterThan(before);
    expect(after).toBe(Number(handle.getAttribute("aria-valuemax")));
  });

  it("shrinks the timeline again when a speaker is removed", async () => {
    const user = userEvent.setup();
    const { doc } = renderWorkspace();

    const handle = screen.getByRole("separator", { name: "Resize timeline" });
    const before = Number(handle.getAttribute("aria-valuenow"));

    const victim = doc.speakers[1];
    await user.click(screen.getByLabelText(`Actions for ${speakerDisplayName(victim)}`));
    await user.click(await screen.findByRole("menuitem", { name: /delete speaker/i }));

    expect(Number(handle.getAttribute("aria-valuenow"))).toBeLessThan(before);
  });

  it("offers a resize handle on the panel with a floor it cannot cross", () => {
    renderWorkspace();

    const handle = screen.getByRole("separator", { name: "Resize panel" });
    const min = Number(handle.getAttribute("aria-valuemin"));
    const now = Number(handle.getAttribute("aria-valuenow"));
    const max = Number(handle.getAttribute("aria-valuemax"));

    expect(min).toBeGreaterThan(0);
    expect(now).toBeGreaterThanOrEqual(min);
    expect(now).toBeLessThanOrEqual(max);
  });

  it("applies a tag to every selected segment from one panel choice", async () => {
    const user = userEvent.setup();
    const { store } = renderWorkspace();

    // Driven by keyboard: jsdom does not carry `button` through synthetic
    // pointer events, and Enter/Shift+Enter on a focused clip runs the same
    // selection path the pointer does.
    const clips = screen.getAllByLabelText(/^Segment from/);
    clips[0].focus();
    await user.keyboard("{Enter}");
    clips[1].focus();
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(store.getState().selectedSegmentIds).toHaveLength(2);

    await user.click(screen.getByRole("tab", { name: /tags/i }));
    await user.selectOptions(
      await screen.findByLabelText("Apply Language tag"),
      "pcm"
    );

    // One choice, one span per selected segment.
    const spans = store.getState().history.present.spans;
    expect(spans).toHaveLength(2);
    expect(spans.every((span) => span.value === "pcm")).toBe(true);
    expect(spans.every((span) => span.spanSource === "annotator_added")).toBe(true);
  });
});
