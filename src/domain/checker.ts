import { COMPANY_TYPES, STATES } from "./reference.js";
import type { BatchResult, IdentifierResult, Issue } from "./types.js";

export const MAX_LINES = 500;
export const MAX_BYTES = 100 * 1024;
export function normalize(input: string): string {
  return input
    .replace(/^[ \t\r\n\v\f\u00a0]+|[ \t\r\n\v\f\u00a0]+$/g, "")
    .replace(/[a-z]/g, (c) => c.toUpperCase());
}
export function currentIndiaYear(): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
}
export function validateIdentifier(
  input: string,
  currentYear: number,
): IdentifierResult {
  const value = normalize(input);
  const r: IdentifierResult = {
    raw: input,
    normalized: value,
    entity: "Unknown",
    valid: false,
    errors: [],
    warnings: [],
    segments: [],
    decoded: {
      listing: null,
      state: null,
      year: null,
      companyType: null,
      industry: null,
      registration: null,
    },
  };
  const add = (
    code: string,
    message: string,
    start = 1,
    end = Math.max(value.length, 1),
  ) => r.errors.push({ code, message, start, end });
  if (!value) {
    add("empty", "Enter a CIN or LLPIN.");
    return r;
  }
  if (/[,;]/.test(value)) {
    add(
      "separator",
      "Paste one identifier per line, without commas or semicolons.",
      value.search(/[,;]/) + 1,
      value.search(/[,;]/) + 1,
    );
    return r;
  }
  if (/\s/.test(value)) {
    const position = value.search(/\s/) + 1;
    add(
      "internal_space",
      "Remove spaces or tabs inside the identifier.",
      position,
      position,
    );
    return r;
  }
  if (/[^\x20-\x7e]/.test(value)) {
    add(
      "non_ascii",
      "Use ASCII letters, digits and the standard hyphen. Remove invisible or lookalike characters.",
      value.search(/[^\x20-\x7e]/) + 1,
      value.search(/[^\x20-\x7e]/) + 1,
    );
    return r;
  }
  if (/^F\d{5}$/.test(value)) {
    add(
      "unsupported",
      "Foreign company and foreign LLP identifiers are unsupported. Enter a domestic CIN or LLPIN.",
    );
    return r;
  }
  const llp =
    !/^[LU]\d/.test(value) &&
    (value.length < 15 || /^[A-Z]{3}[-_]/.test(value));
  r.entity = llp ? "LLP" : "Company";
  const test = (
    pattern: RegExp,
    part: string,
    code: string,
    message: string,
    start: number,
    end: number,
  ) => {
    if (!pattern.test(part)) add(code, message, start, end);
  };
  if (llp) {
    if (value.length !== 8)
      add(
        "length",
        `An LLPIN has 8 characters (AAA-1234); this input has ${value.length}.`,
      );
    if (value.length === 8) {
      test(
        /^[A-Z]{3}$/,
        value.slice(0, 3),
        "prefix",
        "Characters 1–3 must be three letters.",
        1,
        3,
      );
      test(
        /^-$/,
        value[3],
        "hyphen",
        "Character 4 must be a standard hyphen (-).",
        4,
        4,
      );
      test(
        /^\d{4}$/,
        value.slice(4),
        "number",
        "Characters 5–8 must be four digits.",
        5,
        8,
      );
    }
    r.valid = r.errors.length === 0;
    if (r.valid) {
      r.decoded = {
        ...r.decoded,
        listing: "Not applicable",
        companyType: "Limited Liability Partnership",
        registration: value.slice(4),
      };
      r.segments = [
        {
          label: "LLP series",
          value: value.slice(0, 3),
          meaning: "Registration series; state and year are not encoded.",
          start: 1,
          end: 3,
        },
        {
          label: "Separator",
          value: "-",
          meaning: "Standard hyphen",
          start: 4,
          end: 4,
        },
        {
          label: "Serial number",
          value: value.slice(4),
          meaning: "Four-digit registration serial",
          start: 5,
          end: 8,
        },
      ];
    }
    return r;
  }
  if (value.length !== 21) {
    add("length", `A CIN has 21 characters; this input has ${value.length}.`);
    return r;
  }
  const fields = [
    {
      label: "Listing status",
      start: 1,
      end: 1,
      pattern: /^[LU]$/,
      code: "listing",
      message: "Character 1 must be L (listed) or U (unlisted).",
    },
    {
      label: "Industry code",
      start: 2,
      end: 6,
      pattern: /^\d{5}$/,
      code: "industry",
      message: "Characters 2–6 must contain a five-digit industry code.",
    },
    {
      label: "State code",
      start: 7,
      end: 8,
      pattern: /^[A-Z]{2}$/,
      code: "state",
      message: "Characters 7–8 must contain a two-letter state code.",
    },
    {
      label: "Incorporation year",
      start: 9,
      end: 12,
      pattern: /^\d{4}$/,
      code: "year",
      message: "Characters 9–12 must contain a four-digit incorporation year.",
    },
    {
      label: "Company type",
      start: 13,
      end: 15,
      pattern: /^[A-Z]{3}$/,
      code: "type",
      message:
        "Characters 13–15 must contain a three-letter company-type code.",
    },
    {
      label: "Registration number",
      start: 16,
      end: 21,
      pattern: /^\d{6}$/,
      code: "registration",
      message: "Characters 16–21 must contain a six-digit registration number.",
    },
  ];
  const warn = (code: string, message: string, start: number, end: number) =>
    r.warnings.push({ code, message, start, end });
  for (const f of fields) {
    const part = value.slice(f.start - 1, f.end);
    test(f.pattern, part, f.code, f.message, f.start, f.end);
    let meaning = "Invalid segment";
    if (f.pattern.test(part))
      switch (f.code) {
        case "listing":
          r.decoded.listing = part === "L" ? "Listed" : "Unlisted";
          meaning = r.decoded.listing;
          break;
        case "industry":
          r.decoded.industry = part;
          meaning = "Industry code as encoded; NIC version not inferred.";
          break;
        case "state":
          r.decoded.state = STATES[part] ?? null;
          meaning = r.decoded.state ?? "Code needs verification";
          if (!r.decoded.state)
            warn(
              "unknown_state",
              `State code “${part}” is not in our reference table. Verify it against registry records.`,
              7,
              8,
            );
          break;
        case "year":
          if (Number(part) === 0 || Number(part) > currentYear) {
            add(
              "year_range",
              `Incorporation year must be nonzero and no later than ${currentYear}.`,
              9,
              12,
            );
            meaning = "Year outside supported range";
          } else {
            r.decoded.year = part;
            meaning = part;
          }
          break;
        case "type":
          r.decoded.companyType = COMPANY_TYPES[part] ?? null;
          meaning = r.decoded.companyType ?? "Code needs verification";
          if (!r.decoded.companyType)
            warn(
              "unknown_type",
              `Company-type code “${part}” is not in our reference table. Verify it against registry records.`,
              13,
              15,
            );
          break;
        case "registration":
          r.decoded.registration = part;
          meaning = "Six-digit ROC registration number";
          break;
      }
    r.segments.push({
      label: f.label,
      value: part,
      meaning,
      start: f.start,
      end: f.end,
    });
  }
  r.valid = r.errors.length === 0;
  return r;
}
export function checkBatch(input: string, currentYear: number): BatchResult {
  const result: BatchResult = { rows: [], ignoredBlankLines: 0, error: null };
  if (new TextEncoder().encode(input).byteLength > MAX_BYTES) {
    result.error = "Input exceeds 100 KiB. Paste a smaller list.";
    return result;
  }
  const lines = input.split(/\r\n|\r|\n/);
  const seen = new Map<string, number>();
  lines.forEach((raw, index) => {
    if (!normalize(raw)) {
      result.ignoredBlankLines++;
      return;
    }
    const row = validateIdentifier(raw, currentYear);
    result.rows.push({
      ...row,
      line: index + 1,
      duplicateOf: seen.get(row.normalized) ?? null,
    });
    if (!seen.has(row.normalized)) seen.set(row.normalized, index + 1);
  });
  if (!result.rows.length) result.error = "Enter at least one CIN or LLPIN.";
  if (result.rows.length > MAX_LINES) {
    result.rows = [];
    result.error =
      "You can check up to 500 identifiers at once. Split your list into smaller batches.";
  }
  return result;
}
