# FileSure CIN & LLPIN Checker

A responsive batch checker for Indian Corporate Identity Numbers and LLP Identification Numbers. Built as the FileSure technical assignment by Kaartikey Kusshwaha.

- **Live:** https://filesure-cin-checker-chi.vercel.app
- **Source:** https://github.com/KaartikeyKusshwaha/filesure-cin-checker

## What it does

- Validates and decodes up to 500 nonempty lines / 100 KiB locally.
- Explains exact malformed segments and character positions; preserves line numbers and duplicate rows.
- Recognises common, legacy, and ROC-specific codes; unknown alphabetic codes are verification warnings, not invented facts.
- Separates format validity from registration, listing, and current registry status.
- Offers selected-row FileSure sandbox lookup, including confirmed company and LLP samples.
- Provides filters, 50-row pagination, responsive result cards, and safe CSV exports.

## Run locally

Node.js 22.12+ is required. Use Node 22 LTS for parity with deployment.

```sh
npm ci
cp .env.example .env.local
# Set FILESURE_API_KEY in .env.local to your own fsk_test_ key.
npm run dev
```

The Vite development plugin runs the same server adapter as Vercel's API functions. A key is optional for local format checking. `.env.local` is ignored by Git. Never use a VITE-prefixed variable for the API key.

```sh
npm run typecheck
npm test
npx playwright install chromium --only-shell
npm run test:e2e
npm run build
```

The real-registry browser test is explicitly skipped when no sandbox key is configured. All other behaviour can be tested without credentials. Integration fixtures cover the provider boundary; they do not stand in for a real integration claim.

## Design and architecture

The input is the primary action, with an adjacent CIN guide that makes the format understandable before the first check. Desktop results favour comparison across identifiers; mobile cards keep field labels beside their values. Error text names the precise issue instead of saying only "invalid".

`src/domain/` contains pure checking, reference tables, result types, and CSV export. `src/components/` renders batch results and details. `src/registry/` owns the request queue and ten-minute in-memory cache. `server/registry.ts` validates requests, calls the fixed upstream host, checks its response, and returns a minimal DTO. `api/` exposes the Vercel routes.

- `GET /api/config`: configuration availability and confirmed sample identifiers; no secret.
- `POST /api/lookup`: JSON `{ "identifier": "L74110KA2013PLC096530" }`; one result per request.
- Browser lookup concurrency: two; maximum ten unique identifiers per selection.
- Upstream timeout: ten seconds; no automatic retry. Explicit refresh bypasses the successful-result cache.
- New checks, edits and clearing cancel requests and ignore late results.
- No database, browser storage, analytics, input logging, or automatic registry calls.

## Sandbox: real records, limited coverage

Only `fsk_test_` keys are accepted. Paid live keys are deliberately rejected. Test keys cannot debit a wallet. The sandbox supports a fixed whitelist, available from FileSure's `GET /v1/sandbox` endpoint. Arbitrary CINs and LLPINs still receive local checking; lookup outside the whitelist displays **Outside sample set**.

Confirmed on 25 November 2026:

| Identifier | Provider record |
| --- | --- |
| `L74110KA2013PLC096530` | SWIGGY LIMITED |
| `U74999HR2015FTC056386` | CARS24 SERVICES PRIVATE LIMITED |
| `ACK-2998` | SUGEE TWENTY SEVEN DEVELOPERS LLP |
| `ACX-7976` | ZALPE FOOD & BEVERAGES LLP |

Use **Use registry samples**, check the list, select rows, then click **Look up selected**. Expand a row to see registry details and freshness separately from encoded values.

The real API and OpenAPI specification were inspected. Company master-data dates are **MM/DD/YYYY**, listing uses **Y/N**, company and LLP records both use `masterData.companyData`, current status is returned as `llpStatus`, and `meta.updatedAt` supplies provider freshness. See [research](docs/research.md).

## Important boundaries

Format correctness does not establish actual registration. It does not prove the current address, ownership or legal compliance. An LLPIN does not encode its state or incorporation year. Industry codes are checked for digit structure, not against one NIC version. No checksum, arbitrary historical minimum year, or unsupported zero-serial rule is invented.

Dates from the API are normalised only under its documented field-specific contract. Missing data stays missing. Changed identifiers and registry differences are displayed without overwriting the submitted identifier's interpretation.

## Deploy

The project uses Vite plus Vercel Node API functions. Configure `FILESURE_API_KEY` as a sensitive **server-side** production environment variable, then deploy:

```sh
vercel link
vercel env add FILESURE_API_KEY production --sensitive
vercel --prod
```

Optional `FILESURE_SANDBOX_SAMPLES` overrides the displayed confirmed samples with a comma-separated list. Never place secrets in source, shell command arguments, public screenshots, or transcripts.

## Assignment materials

- [Video outline](submission/video-outline.md)
- [Submission checklist](submission/checklist.md)
- [Authentic AI correction](docs/ai-correction.md)
- [Research and sources](docs/research.md)

Run `npm run transcripts` to collect this task's complete original JSONL session logs and any descendant review sessions into an ignored local folder, with hashes and a ZIP archive. These are intentionally excluded from the public repository. The chat-supplied test key was rotated and explicitly revoked on 25 November 2026; its replacement is configured privately in Vercel and the ignored local environment. The old key returns HTTP 401, and production company and LLP lookups remain verified. Preserve the original transcripts; do not silently redact or rewrite them. Do not include active credentials in future conversations.
