import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Results } from "../src/components/Results";
import { checkBatch } from "../src/domain/checker";
import type { RegistryResult } from "../src/domain/types";

const record: RegistryResult = {
  state: "found",
  message: "Registry record found.",
  data: {
    identifier: "ACK-2998",
    name: "SUGEE TWENTY SEVEN DEVELOPERS LLP",
    state: "Maharashtra",
    incorporated: "2024-11-11",
    companyType: "Limited Liability Partnership",
    listing: null,
    status: "Active",
    providerUpdatedAt: null,
  },
  retrievedAt: "2026-11-27T12:00:00Z",
};

function results(
  registry: Record<string, RegistryResult> = {},
  identifier = "ACK-2998",
) {
  return (
    <Results
      rows={checkBatch(identifier, 2026).rows}
      ignored={0}
      stale={false}
      registry={registry}
      selected={new Set()}
      setSelected={vi.fn()}
      onLookup={vi.fn()}
      busy={false}
      configured
    />
  );
}

function expectFields(state: string, incorporated: string) {
  const row = within(screen.getByRole("table")).getAllByRole("row")[1];
  const cells = within(row).getAllByRole("cell");
  expect(cells[6]).toHaveTextContent(new RegExp(`^${state}$`));
  expect(cells[7]).toHaveTextContent(new RegExp(`^${incorporated}$`));
  const card = within(screen.getByRole("article"));
  expect(card.getByText("State").nextElementSibling).toHaveTextContent(state);
  expect(card.getByText("Incorporated").nextElementSibling).toHaveTextContent(
    incorporated,
  );
}

it("updates collapsed LLP rows and mobile cards when registry fields arrive", () => {
  const { rerender } = render(results());
  expectFields("Not encoded", "Not encoded");
  rerender(
    results({ "ACK-2998": { state: "loading", message: "Looking up…" } }),
  );
  expectFields("Not encoded", "Not encoded");
  rerender(results({ "ACK-2998": record }));
  expectFields("Maharashtra", "2024-11-11");
  expect(
    screen.queryByRole("region", { name: "Registry details" }),
  ).not.toBeInTheDocument();
});

it.each([
  [null, "2024-11-11", "Not encoded", "2024-11-11"],
  ["Maharashtra", null, "Maharashtra", "Not encoded"],
  [null, null, "Not encoded", "Not encoded"],
  ["", "", "Not encoded", "Not encoded"],
])(
  "falls back independently for missing LLP fields (%s, %s)",
  (state, incorporated, shownState, shownDate) => {
    render(
      results({
        "ACK-2998": {
          ...record,
          data: { ...record.data!, state, incorporated },
        },
      }),
    );
    expectFields(shownState!, shownDate!);
  },
);

it("keeps LLP fields unencoded when a lookup fails", () => {
  render(
    results({ "ACK-2998": { state: "error", message: "Lookup failed." } }),
  );
  expectFields("Not encoded", "Not encoded");
});

it("preserves CIN decoded fields when registry values differ", () => {
  render(
    results(
      {
        L17110MH1973PLC019786: {
          ...record,
          data: {
            ...record.data!,
            identifier: "L17110MH1973PLC019786",
            state: "Karnataka",
          },
        },
      },
      "L17110MH1973PLC019786",
    ),
  );
  expectFields("Maharashtra", "1973");
});
