import { afterEach, describe, expect, it } from "vitest";
import { installRadixPointerGuard } from "../radix-pointer-guard";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("installRadixPointerGuard", () => {
  let uninstall = () => {};

  afterEach(() => {
    uninstall();
    document.body.removeAttribute("style");
    document.body.innerHTML = "";
  });

  /* The bug: a dialog closed, and the page stayed dead to clicks. */
  it("unlocks the page when nothing is open", async () => {
    uninstall = installRadixPointerGuard();
    document.body.style.pointerEvents = "none";
    await settle();
    expect(document.body.style.pointerEvents).toBe("");
  });

  it("leaves the lock alone while a dialog is open", async () => {
    uninstall = installRadixPointerGuard();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.dataset.state = "open";
    document.body.appendChild(dialog);
    document.body.style.pointerEvents = "none";
    await settle();
    expect(document.body.style.pointerEvents).toBe("none");

    /* And lets go once it has gone. */
    dialog.remove();
    await settle();
    expect(document.body.style.pointerEvents).toBe("");
  });
});
