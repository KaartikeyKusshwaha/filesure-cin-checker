# Approved implementation plan — 25 November 2026

Build a React/TypeScript/Vite CIN and LLPIN checker, FileSure-style, with local validation of 500 nonempty lines/100 KiB, exact segment errors, reference warnings, preserved duplicates/line numbers, source-linked decoding, responsive cards/table, 50-row pagination, filters, safe CSV export, keyboard access and stale-result protection.

Selected registry lookup uses a server-only FileSure sandbox key, one identifier per POST /api/lookup, browser concurrency two, ten unique selections, ten-second timeout, no automatic retries, ten-minute memory cache. GET /api/config exposes availability and confirmed samples only. Live keys fail closed. Registry identity/status is separate from syntax validity. Provider schema and whitelist must be verified with a real test key; no mocked success may be presented as real.

Stages: research/provider preflight; tested domain; responsive interface; tested registry adapter; acceptance QA; GitHub/Vercel release; full unedited transcript packaging and eight-minute video outline. No paid calls, scraping, accounts, database, document reports or email sending. User records screen/face/voice.

Acceptance: typecheck, unit/component/API tests, browser tests at 360/390/768/1440px, 500-row performance measured, successful production sandbox sample request (external key dependency), public page/repository, documented limitations and submission materials.

This records the full plan approved in the project conversation; that unedited conversation is the authoritative detailed specification.
