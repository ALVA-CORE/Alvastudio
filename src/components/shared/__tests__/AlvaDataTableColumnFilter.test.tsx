import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlvaDataTable } from "../AlvaDataTable";

type Row = { id: string; name: string; mode: string };
const rows: Row[] = [
  { id: "a", name: "Ada", mode: "Stimuli" },
  { id: "b", name: "Bola", mode: "Prompt reader" },
  { id: "c", name: "Chidi", mode: "Stimuli" },
];
const columns = [
  { key: "name", header: "Name", render: (row: Row) => row.name },
  { key: "mode", header: "Mode", render: (row: Row) => row.mode, filterValue: (row: Row) => row.mode },
];

describe("column filter", () => {
  it("shows only the rows whose value is ticked, and all again on Show all", async () => {
    render(<AlvaDataTable title="Clips" rows={rows} columns={columns} />);
    const table = screen.getByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Filter Mode" }));
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Prompt reader" }));
    await userEvent.keyboard("{Escape}");

    expect(within(table).getByText("Bola")).toBeInTheDocument();
    expect(within(table).queryByText("Ada")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Filter Mode" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Show all" }));
    expect(within(table).getByText("Ada")).toBeInTheDocument();
  });

  it("has no filter on a column without values to pick from", () => {
    render(<AlvaDataTable title="Clips" rows={rows} columns={columns} />);
    expect(screen.queryByRole("button", { name: "Filter Name" })).not.toBeInTheDocument();
  });
});
