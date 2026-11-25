# Execution ledger — docs/implementation-plan.md

- Approved: React/TypeScript, FileSure style, free sandbox, selected rows, GitHub and Vercel publication.
- Isolation: dedicated new Git repository on codex/implement-checker; unrelated parent workspace untouched.
- Preflight: no FileSure key configured; requested secure configuration while independent work continues. Public API docs return HTTP 403 to direct requests. No real schema/whitelist claimed verified.
- Interfaces: shared IdentifierResult feeds UI/export and server revalidation; RegistryResult feeds selected lookup UI. One request per identifier; concurrency belongs to browser queue.
- Ruling: use dedicated repository instead of a worktree of the unrelated parent repository — approved separate-project requirement — no effect on existing projects.
- Validation stage complete: initially observed failing tests, implemented domain engine; baseline 44 tests passed.
- API preflight complete: real sandbox company and LLP requests returned HTTP 200, zero charge. Confirmed 52 records, including ACK-2998 and ACX-7976. Real OpenAPI and responses corrected the initial DD/MM date assumption to MM/DD; regression tests observed RED then GREEN.
- UI/adapter baseline: 72 unit/component tests passed, real local HTTP company/LLP integration passed. Initial 500-line browser check including driver overhead measured 219 ms (later run 196 ms).
- Fresh reviewer identified overlapping LLP-prefix rejection, truncated-CIN diagnostic classification, imprecise character ranges, hardcoded input gutter, Windows ZIP invocation, and deployment exclusion gap. Domain/timeout fixes verified by new regression tests: suite 77/77 passed. Added explicit .vercelignore before any deployment containing local transcript artifacts.
- Ruling: removed the decorative input gutter rather than simulate line numbers — physical input line numbers remain accurate in results — input editing loses decorative numbers but avoids incorrect scrolling labels.
- Deployment smoke test caught ERR_MODULE_NOT_FOUND in the transitive ESM imports. Made relative production imports explicit .js and pinned runtime to Node 22.x; the public deployment will be rechecked, not inferred from build success.
- Browser cancellation test exposed a native fetch receiver error hidden by arrow-function unit mocks. Default fetch now uses a forwarding function rather than an object-bound native fetch. Browser regression is part of final verification.
- Packaging verification: three relevant original AI sessions copied byte-for-byte; Windows ZIP invocation fixed to pass paths through dedicated child environment variables. Archive is local and ignored by both Git and Vercel.
- Ruling: use the actual Vercel-assigned filesure-cin-checker-chi.vercel.app alias — assumed shorter slug was not assigned — all delivery links updated.
- No reviewer findings deferred: duplicate disclosure IDs, streamed-body timeout diagnostics, and cross-page test coverage also addressed during this fix pass.
