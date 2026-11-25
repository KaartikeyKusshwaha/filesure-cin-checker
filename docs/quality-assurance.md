# Verification record

25 November 2026, Windows / Node 22.20.0. Checks were run against the implementation, not inferred from code review.

| Check | Result |
| --- | --- |
| TypeScript strict typecheck | Passed |
| Unit/component/adapter tests | 77 passed |
| Browser acceptance and automated WCAG AA scans | 10 passed locally |
| Responsive widths | 360, 390, 768, 1440 px; no page-level horizontal overflow |
| 500-line batch, pagination, filters and CSV | Passed; 235 ms in final local browser run, including driver overhead |
| Public-site browser smoke suite before final contrast polish | 8 passed; 151 ms for the 500-line check |
| Real sandbox company and LLP requests | HTTP 200; normalised incorporation dates and fields verified |
| Non-whitelisted identifier | Explicit unsupported-in-sandbox result |
| Secrets and original transcripts excluded from deployment | Vercel dry-run file manifest inspected; no private artifacts in selected regular files |
| Transcript ZIP | Three original session logs, matching manifest SHA-256 hashes |
| npm audit | Zero vulnerabilities |

The final production smoke check is recorded in the delivery conversation. Automated accessibility testing supplements keyboard and responsive checks; it is not a claim of a complete manual assistive-technology audit.

## Review fixes

- Accepted all three-letter LLP series allowed by the advertised grammar; stopped treating arbitrary F-leading series or LLP-1234 as foreign IDs.
- Identified truncated CINs correctly and reported precise corrupted-character positions.
- Removed the misleading fixed input line-number gutter; physical line numbers remain in results.
- Corrected the Windows archive invocation; verified original bytes and ZIP hashes.
- Excluded transcript, environment, trace and test output from Vercel CLI uploads.
- Added explicit ESM import extensions after deployed runtime logs exposed an unresolved-module error.
- Corrected native browser fetch binding, verified by the cancellation browser regression.
- Made responsive disclosure IDs unique; preserved streamed-body timeout diagnostics; tested selections across actual pages.
- Darkened low-contrast secondary text. WCAG AA automated scans passed at desktop and mobile widths.

## Remaining user contributions

Record the required screen/face/voice video, determine the actual email deadline, rotate the key supplied in chat before sharing unedited transcripts, and submit the package. The transcript packaging command can be rerun after further chat messages to refresh the snapshot.
