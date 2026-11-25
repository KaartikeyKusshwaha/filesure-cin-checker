import type { RegistryResult } from "../domain/types.js";
export class RegistryClient {
  private cache = new Map<string, { at: number; result: RegistryResult }>();
  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private now: () => number = Date.now,
  ) {}
  async lookupIdentifier(
    id: string,
    signal?: AbortSignal,
    refresh = false,
  ): Promise<RegistryResult> {
    const cached = this.cache.get(id);
    if (!refresh && cached && this.now() - cached.at < 600_000)
      return cached.result;
    try {
      const response = await this.fetcher("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
        signal,
      });
      const result = (await response.json()) as RegistryResult;
      if (
        ![
          "found",
          "not_found",
          "unsupported_in_sandbox",
          "unavailable",
          "error",
        ].includes(result.state) ||
        typeof result.message !== "string" ||
        (result.state === "found" &&
          (!result.data ||
            typeof result.data.identifier !== "string" ||
            typeof result.data.name !== "string"))
      )
        throw new Error("Incompatible response");
      if (result.state === "found" && !signal?.aborted)
        this.cache.set(id, { at: this.now(), result });
      return result;
    } catch {
      return {
        state: "error",
        message:
          "Registry lookup could not connect. Check your connection and try again.",
      };
    }
  }
  async lookupSelected(
    ids: string[],
    signal: AbortSignal,
    done: (id: string, r: RegistryResult) => void,
    refresh = false,
  ): Promise<void> {
    const queue = [...new Set(ids)].slice(0, 10);
    let index = 0;
    const worker = async () => {
      while (!signal.aborted && index < queue.length) {
        const id = queue[index++];
        const result = await this.lookupIdentifier(id, signal, refresh);
        if (!signal.aborted) done(id, result);
      }
    };
    await Promise.all([worker(), worker()]);
  }
}
