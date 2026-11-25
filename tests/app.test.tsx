import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        mode: "unconfigured",
        samples: [],
        message: "Registry lookup is not configured.",
      }),
    ),
  );
});
it("explains empty input, checks examples, and marks edited results as outdated", async () => {
  const u = userEvent.setup();
  render(<App />);
  await u.click(screen.getByRole("button", { name: /check identifiers/i }));
  expect(screen.getByRole("alert")).toHaveTextContent(/at least one/i);
  await u.click(screen.getByRole("button", { name: /try examples/i }));
  await u.click(screen.getByRole("button", { name: /check identifiers/i }));
  expect(
    await screen.findByRole("heading", { name: /your results/i }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Invalid format").length).toBeGreaterThan(0);
  await u.type(
    screen.getByRole("textbox", { name: /identifiers/i }),
    "\nAAA-5555",
  );
  expect(screen.getByText(/results are outdated/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export all" })).toBeDisabled();
});
it("supports keyboard checking and clear resets input and results", async () => {
  render(<App />);
  const area = screen.getByRole("textbox", { name: /identifiers/i });
  fireEvent.change(area, { target: { value: "AAA-1234" } });
  fireEvent.keyDown(area, { key: "Enter", ctrlKey: true });
  expect(
    await screen.findByRole("heading", { name: /your results/i }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(area).toHaveValue("");
  expect(
    screen.queryByRole("heading", { name: /your results/i }),
  ).not.toBeInTheDocument();
});
it("paginates 500 rows and filters invalid inputs", async () => {
  render(<App />);
  fireEvent.change(screen.getByRole("textbox", { name: /identifiers/i }), {
    target: { value: Array(499).fill("AAA-1234").concat("BAD").join("\n") },
  });
  fireEvent.click(screen.getByRole("button", { name: /check identifiers/i }));
  expect(screen.getByText(/1–50 of 500/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Format filter" }), {
    target: { value: "invalid" },
  });
  expect(screen.getByText(/1–1 of 1/)).toBeInTheDocument();
  expect(screen.getAllByText("BAD").length).toBeGreaterThan(0);
});
it("never sends identifiers just because local checking runs", async () => {
  render(<App />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  fireEvent.change(screen.getByRole("textbox", { name: /identifiers/i }), {
    target: { value: "AAA-1234" },
  });
  fireEvent.click(screen.getByRole("button", { name: /check identifiers/i }));
  expect(
    vi.mocked(fetch).mock.calls.every(([url]) => url === "/api/config"),
  ).toBe(true);
});
