import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlvaDataTable } from "../AlvaDataTable";

const rows = Array.from({ length: 5000 }, (_, index) => ({ id: String(index), name: `Row ${index + 1}` }));
const columns = [{ key: "name", header: "Name", render: (row: (typeof rows)[number]) => row.name }];

function table() {
  render(<AlvaDataTable title="Rows" rows={rows} columns={columns} pageSize={10} />);
  return screen.getByRole("textbox", { name: /Page, of 500/ });
}

const shows = (name: string) => screen.queryAllByText(name).length > 0;

describe("table pager", () => {
  /* 500 pages: one typed number, not 499 presses of Next. */
  it("goes straight to a typed page", async () => {
    const field = table();
    await userEvent.clear(field);
    await userEvent.type(field, "340{Enter}");
    expect(shows("Row 3391")).toBe(true);
    expect(shows("Row 3401")).toBe(false);
  });

  it("pulls a page out of range back to the nearest one", async () => {
    const field = table();
    await userEvent.clear(field);
    await userEvent.type(field, "9999{Enter}");
    expect(field).toHaveValue("500");
    expect(shows("Row 5000")).toBe(true);
  });

  it("keeps the rows in view when the page size changes", async () => {
    const field = table();
    await userEvent.clear(field);
    await userEvent.type(field, "13{Enter}");
    expect(shows("Row 121")).toBe(true);

    await userEvent.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await userEvent.click(await screen.findByRole("option", { name: "50 rows" }));
    expect(screen.getByRole("textbox", { name: /Page, of 100/ })).toHaveValue("3");
    expect(shows("Row 101")).toBe(true);
    expect(shows("Row 150")).toBe(true);
  });
});

describe("table search", () => {
  const clips = [
    { id: "1", code: "REC-001", contributor: "Esther Obi", reviewer: { name: "Ajala Ayomide" }, status: "rejected" },
    { id: "2", code: "REC-002", contributor: "Mercy Emmanuel", reviewer: { name: "Ifeoma Nwosu" }, status: "approved" },
  ];
  const clipColumns = [{ key: "code", header: "Clip", render: (row: (typeof clips)[number]) => row.code }];

  /* Any field, nested ones too, and words in any order. */
  it("finds a row by anything in it", async () => {
    render(<AlvaDataTable title="Clips" rows={clips} columns={clipColumns} pageSize={10} />);
    const search = screen.getByRole("textbox", { name: "Search" });

    await userEvent.type(search, "ajala");
    expect(screen.queryAllByText("REC-001").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("REC-002")).toHaveLength(0);

    await userEvent.clear(search);
    await userEvent.type(search, "approved nwosu");
    expect(screen.queryAllByText("REC-002").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("REC-001")).toHaveLength(0);
  });

  it("says how many rows there are", () => {
    table();
    expect(screen.getByText("of 5,000 rows")).toBeInTheDocument();
  });
});

describe("server-paged table", () => {
  const page = [{ id: "1", name: "Row 1" }];
  const sortable = [
    { key: "name", header: "Name", serverSort: "contributor", render: (row: (typeof page)[number]) => row.name },
  ];

  /* The server holds the rows, so the table only says what was asked for. */
  it("sends the search once typing pauses, and the sort on a header press", async () => {
    const queries: string[] = [];
    const sorts: string[] = [];
    render(
      <AlvaDataTable
        title="Rows"
        rows={page}
        columns={sortable}
        pageSize={10}
        serverPaging={{
          total: 1,
          page: 1,
          onPageChange: () => undefined,
          onQueryChange: (query) => queries.push(query),
          onSortChange: (key, dir) => sorts.push(`${key}:${dir}`),
        }}
      />
    );

    await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "  obi ");
    await waitFor(() => expect(queries).toEqual(["obi"]));

    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    await userEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(sorts).toEqual(["contributor:asc", "contributor:desc"]);
  });

  it("has no search box when the server cannot search", () => {
    render(
      <AlvaDataTable
        title="Rows"
        rows={page}
        columns={sortable}
        pageSize={10}
        serverPaging={{ total: 1, page: 1, onPageChange: () => undefined }}
      />
    );
    expect(screen.queryByRole("textbox", { name: "Search" })).not.toBeInTheDocument();
  });
});
