import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlvaDataTable } from "../AlvaDataTable";

type Row = { id: string; name: string; active: boolean };
const rows: Row[] = [
  { id: "a", name: "Alpha", active: true },
  { id: "b", name: "Beta", active: true },
  { id: "c", name: "Gamma", active: false },
];
const columns = [{ key: "name", header: "Name", render: (row: Row) => row.name }];

function Harness({ onRowClick = () => {} }: { onRowClick?: (row: Row) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <AlvaDataTable
      title="Bank"
      rows={rows}
      columns={columns}
      onRowClick={onRowClick}
      selection={{
        selected,
        onChange: setSelected,
        canSelect: (row) => row.active,
        actions: <button type="button">Retire</button>,
      }}
    />
  );
}

/* The phone list and the desktop table are both in the DOM; take the table's. */
const rowBoxes = () => {
  const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
  return boxes.slice(boxes.length / 2);
};

describe("table selection", () => {
  it("shows the count and the actions in place of the title once a row is picked", async () => {
    const onRowClick = vi.fn();
    render(<Harness onRowClick={onRowClick} />);
    expect(screen.getByText("Bank")).toBeInTheDocument();

    await userEvent.click(rowBoxes()[0]);
    expect(await screen.findByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retire" })).toBeInTheDocument();
    /* Ticking a row does not open it. */
    expect(onRowClick).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(screen.queryByText("1 selected")).not.toBeInTheDocument());
  });

  it("gives rows that cannot be picked no box, and the header box picks the rest", async () => {
    render(<Harness />);
    expect(rowBoxes()).toHaveLength(2);

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
    expect(await screen.findByText("2 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
    await waitFor(() => expect(screen.queryByText(/selected/)).not.toBeInTheDocument());
  });
});
