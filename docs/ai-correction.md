# An authentic AI mistake and how it was caught

## The initial mistake

The first API adapter interpreted slash-separated incorporation dates as DD/MM/YYYY, based on an illustrative website response. That assumption was not established by the actual endpoint contract.

## Evidence that caught it

After the user supplied a test key, real HTTP calls returned:

- Swiggy: `12/26/2013`
- Cars24: `08/12/2015`
- LLP ACX-7976: `04/28/2026`

`26` and `28` cannot be months. The published OpenAPI text then confirmed company master-data dates use MM/DD/YYYY, while filing records use DD/MM/YYYY. The first parser would have returned no date for Swiggy and the wrong month/day for Cars24.

## Correction and proof

New regression tests were written and run against the initial parser. They failed. The adapter was then changed to interpret the documented month/day/year format, validate calendar dates, and normalise to ISO dates:

- `08/12/2015` → `2015-08-12`
- `04/28/2026` → `2026-04-28`

Real integration tests check `2013-12-26` for Swiggy and `2026-04-28` for the LLP. The same preflight also corrected listing Y/N, the shared companyData envelope, llpStatus, and the exact SANDBOX_ONLY error.

For the video, show the dated conversation, the regression test in `tests/registry.test.ts`, and `dateValue` in `server/registry.ts`. The correction is real; no deliberate bug was staged.
