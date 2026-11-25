import type { Row, RegistryResult } from "./types.js";
function cell(value: unknown): string {
  let text = String(value ?? "");
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function exportCsv(
  rows: Row[],
  registry: Record<string, RegistryResult>,
): string {
  const headers = [
    "Line",
    "Original input",
    "Identifier",
    "Format",
    "Warnings",
    "Entity",
    "Listing (encoded)",
    "State (encoded)",
    "Year (encoded)",
    "Type (encoded)",
    "Industry code",
    "Registration number",
    "Duplicate of line",
    "Errors",
    "Registry result",
    "Registry name",
    "Registry identifier",
    "Registry state",
    "Registry incorporation date",
    "Registry type",
    "Registry listing",
    "Registry status",
    "Retrieved at",
  ];
  return [
    headers,
    ...rows.map((row) => {
      const lookup = registry[row.normalized];
      const d = lookup?.data;
      return [
        row.line,
        row.raw,
        row.normalized,
        row.valid ? "Valid format" : "Invalid format",
        row.warnings.map((x) => x.message).join(" | "),
        row.entity,
        row.decoded.listing,
        row.decoded.state ??
          (row.entity === "LLP" && row.valid ? "Not encoded in LLPIN" : ""),
        row.decoded.year ??
          (row.entity === "LLP" && row.valid ? "Not encoded in LLPIN" : ""),
        row.decoded.companyType,
        row.decoded.industry,
        row.decoded.registration,
        row.duplicateOf,
        row.errors.map((x) => x.message).join(" | "),
        lookup?.state ?? "not_checked",
        d?.name,
        d?.identifier,
        d?.state,
        d?.incorporated,
        d?.companyType,
        d?.listing,
        d?.status,
        lookup?.retrievedAt,
      ];
    }),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
export function downloadCsv(
  rows: Row[],
  registry: Record<string, RegistryResult>,
): void {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + exportCsv(rows, registry)], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "filesure-identifier-results.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
