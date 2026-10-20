import { renderHook, act, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it } from "vitest";
import { useFormDraft } from "../useFormDraft";

/**
 * The one rule that is not a convenience: a password must never reach disk.
 *
 * Everything else here is about not making somebody retype five steps of
 * demographic questions because a tab reloaded.
 */

const KEY = "test-draft";

type Values = { fullName: string; password: string; confirmPassword: string };

function setup(step?: number) {
  return renderHook(() => {
    const form = useForm<Values>({
      defaultValues: { fullName: "", password: "", confirmPassword: "" },
    });
    const draft = useFormDraft(form, {
      key: KEY,
      step,
      exclude: ["password", "confirmPassword"],
    });
    return { form, draft };
  });
}

function stored() {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as { values: Partial<Values>; step?: number }) : null;
}

describe("useFormDraft", () => {
  beforeEach(() => localStorage.clear());

  it("never writes an excluded field", async () => {
    const { result } = setup();

    act(() => {
      result.current.form.setValue("fullName", "Ada Obi");
      result.current.form.setValue("password", "hunter2");
      result.current.form.setValue("confirmPassword", "hunter2");
    });

    await waitFor(() => expect(stored()?.values.fullName).toBe("Ada Obi"));
    expect(stored()?.values).not.toHaveProperty("password");
    expect(stored()?.values).not.toHaveProperty("confirmPassword");
    expect(localStorage.getItem(KEY)).not.toContain("hunter2");
  });

  it("saves the step alongside the values", async () => {
    const { result } = setup(3);

    act(() => result.current.form.setValue("fullName", "Ada"));

    await waitFor(() => expect(stored()?.step).toBe(3));
  });

  it("restores what was saved", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ values: { fullName: "Bola Eze" }, step: 2 })
    );

    const { result } = setup();

    await waitFor(() =>
      expect(result.current.form.getValues("fullName")).toBe("Bola Eze")
    );
    /* Merged over the defaults, so a field the draft predates is still "". */
    expect(result.current.form.getValues("password")).toBe("");
  });

  it("survives a corrupt draft", async () => {
    localStorage.setItem(KEY, "{not json");

    const { result } = setup();

    expect(result.current.form.getValues("fullName")).toBe("");
  });

  it("clears on request", async () => {
    const { result } = setup();

    act(() => result.current.form.setValue("fullName", "Ada"));
    await waitFor(() => expect(stored()).not.toBeNull());

    act(() => result.current.draft.clear());
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
