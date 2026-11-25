import { expect, it } from "vitest";
import { RegistryClient } from "../src/registry/client";
it("reuses successful lookups for ten minutes then expires them", async () => {
  let calls = 0;
  let now = 0;
  const client = new RegistryClient(
    async () => {
      calls++;
      return Response.json({
        state: "found",
        message: "ok",
        data: { identifier: "AAA-1234", name: "Test LLP" },
      });
    },
    () => now,
  );
  await client.lookupIdentifier("AAA-1234");
  await client.lookupIdentifier("AAA-1234");
  expect(calls).toBe(1);
  now = 600001;
  await client.lookupIdentifier("AAA-1234");
  expect(calls).toBe(2);
});
it("allows explicit refresh and does not cache failed lookups", async () => {
  let calls = 0;
  const client = new RegistryClient(async () => {
    calls++;
    return Response.json({ state: "error", message: "fail" });
  });
  await client.lookupIdentifier("AAA-1234");
  await client.lookupIdentifier("AAA-1234");
  expect(calls).toBe(2);
});
it("caps concurrency at two and updates each unique identifier independently", async () => {
  let active = 0,
    max = 0;
  const seen: string[] = [];
  const client = new RegistryClient(async (_url, options) => {
    active++;
    max = Math.max(max, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return Response.json({
      state: "not_found",
      message: JSON.parse(String(options?.body)).identifier,
    });
  });
  await client.lookupSelected(
    ["AAA-1234", "AAA-1234", "BBB-1234", "CCC-1234"],
    new AbortController().signal,
    (id) => seen.push(id),
  );
  expect(max).toBe(2);
  expect(seen.sort()).toEqual(["AAA-1234", "BBB-1234", "CCC-1234"]);
});
it("honours cancellation without publishing late results", async () => {
  const control = new AbortController();
  const seen: string[] = [];
  const client = new RegistryClient(async () => {
    control.abort();
    return Response.json({ state: "found", message: "late" });
  });
  await client.lookupSelected(
    ["AAA-1234", "BBB-1234", "CCC-1234"],
    control.signal,
    (id) => seen.push(id),
  );
  expect(seen).toEqual([]);
});
