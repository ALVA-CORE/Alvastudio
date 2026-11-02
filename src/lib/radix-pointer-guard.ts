/**
 * Clears a page lock nothing is holding.
 *
 * Radix overlays (dialogs, sheets, modal menus) set `pointer-events: none`
 * on <body> while open and put it back on close. When two of them open and
 * close in the same moment, say a menu item that opens a dialog, the restore
 * can run in the wrong order and leave the page unclickable until a refresh.
 *
 * Non-modal menus remove the usual cause (see `ui/dropdown-menu`). This is
 * the net under it: whenever <body>'s style changes, if it is locked and no
 * overlay is actually open, unlock it.
 */
const OPEN_OVERLAY = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
].join(",");

export function installRadixPointerGuard() {
  if (typeof document === "undefined") return () => {};

  let frame = 0;
  const check = () => {
    frame = 0;
    const body = document.body;
    if (body.style.pointerEvents !== "none") return;
    if (document.querySelector(OPEN_OVERLAY)) return;
    body.style.removeProperty("pointer-events");
  };

  /* A frame later, not at once. A closing dialog is still in the DOM, still
     `open`, for its exit animation, and the next one may be mounting. */
  const observer = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(check);
  });
  /* One call: a second `observe` on the same node replaces the first's
     options rather than adding to them. Style for the lock itself, children
     because an overlay leaving the DOM does not touch <body>'s style. */
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
    childList: true,
  });

  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}
