# Video outline — target eight minutes

Record your **screen, face and voice**. Keep the exported video under ten minutes. Enlarge the browser and editor enough for the text to be legible. Keep credentials and environment settings closed.

## 0:00–1:00 — What the page does

Introduce yourself and the FileSure assignment. Show the public URL and paste a company CIN plus LLPIN. Explain that format checking stays on the device and registration lookup is separate.

## 1:00–2:30 — Useful behaviour and tricky inputs

Use Try examples. Show a future year and malformed LLPIN. Expand an error to show its precise character position. Demonstrate a valid public-but-unlisted CIN. Use responsive mode to show labelled mobile cards. Paste the prepared 500-line sample and demonstrate pagination and filters.

## 2:30–3:30 — Real sandbox data

Use registry samples, check them, select Swiggy and an LLP, and click Look up selected. Expand the rows. Explain that the sandbox contains sample records; local validation accepts arbitrary supported-format identifiers. Show the provider record date and the retrieval time. Explain why you never infer an LLP's state/year from its series.

## 3:30–4:30 — One design decision

Explain the separation between a fast local check and optional registry lookup: clear results arrive immediately, bulk input never triggers hundreds of network requests, and an API outage does not block the core task. Show desktop comparison rows and mobile cards as the same information arranged for different screens.

## 4:30–6:30 — Code walkthrough

Open `src/domain/checker.ts`: point out explicit CIN segments, error ranges, normalisation and preserved line numbers. Show `reference.ts` and the PN/OR/UR/TG cases. Open `server/registry.ts`: request validation, server-only key, fixed endpoint, timeout, response validation. Show the two-worker queue and memory cache in `src/registry/client.ts`.

## 6:30–8:00 — AI mistake caught and corrected

Use `docs/ai-correction.md` as your prompt, in your own words. Show the conversation where the live response disproved the DD/MM assumption, then the regression tests and corrected parser. Run the tests. Conclude with the public repository and live URL.

## Before recording

- Run the tests and open the deployed page.
- Keep the actual correction conversation ready.
- Close tabs and files containing secrets.
- Ensure face camera, microphone and screen capture are all enabled.
- Check the exported duration and play the opening and closing sections.
