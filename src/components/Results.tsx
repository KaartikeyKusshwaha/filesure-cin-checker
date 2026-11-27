import { Fragment, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { RegistryResult, Row } from "../domain/types.js";
import { downloadCsv } from "../domain/export.js";
import { ResultDetails } from "./ResultDetails.js";
const registryLabels: Record<string, string> = {
  not_checked: "Not checked",
  loading: "Looking up…",
  found: "Record found",
  not_found: "No sandbox record",
  unsupported_in_sandbox: "Outside sample set",
  unavailable: "Unavailable",
  error: "Lookup failed",
};
export function Results({
  rows,
  ignored,
  stale,
  registry,
  selected,
  setSelected,
  onLookup,
  busy,
  configured,
}: {
  rows: Row[];
  ignored: number;
  stale: boolean;
  registry: Record<string, RegistryResult>;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onLookup: (ids: string[], refresh?: boolean) => void;
  busy: boolean;
  configured: boolean;
}) {
  const [format, setFormat] = useState("all");
  const [entity, setEntity] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");
  const filtered = rows.filter(
    (r) =>
      (format === "all" ||
        (format === "valid" && r.valid) ||
        (format === "invalid" && !r.valid) ||
        (format === "warnings" && r.warnings.length > 0)) &&
      (entity === "all" || r.entity === entity),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 50, currentPage * 50);
  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;
  const warnings = rows.filter((r) => r.warnings.length > 0).length;
  const disabled = stale || busy || !configured;
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 10) next.add(id);
    else {
      setNotice("Select up to 10 unique identifiers per lookup.");
      return;
    }
    setNotice("");
    setSelected(next);
  }
  function expand(line: number) {
    const next = new Set(expanded);
    if (next.has(line)) next.delete(line);
    else next.add(line);
    setExpanded(next);
  }
  const formatBadge = (r: Row) => (
    <div className="format-cell">
      <span className={`badge ${r.valid ? "success" : "danger"}`}>
        {r.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}{" "}
        {r.valid ? "Valid format" : "Invalid format"}
      </span>
      {r.warnings.length > 0 && (
        <span className="warning-label">
          <Info size={12} /> Code needs verification
        </span>
      )}
    </div>
  );
  const selection = (r: Row) => (
    <input
      type="checkbox"
      aria-label={`Select ${r.normalized} on line ${r.line}`}
      checked={selected.has(r.normalized)}
      disabled={!r.valid || disabled}
      onChange={() => toggle(r.normalized)}
    />
  );
  const values = (r: Row) => {
    const isLlp = r.entity === "LLP" && r.valid;
    const lookup = registry[r.normalized];
    const record = isLlp && lookup?.state === "found" ? lookup.data : undefined;
    return {
      listing: r.decoded.listing ?? "—",
      state: isLlp ? record?.state || "Not encoded" : (r.decoded.state ?? "—"),
      year: isLlp
        ? record?.incorporated || "Not encoded"
        : (r.decoded.year ?? "—"),
      type: r.decoded.companyType ?? "—",
    };
  };
  return (
    <section
      className={`results-section ${stale ? "outdated" : ""}`}
      aria-labelledby="results-title"
    >
      <div className="section-title">
        <div>
          <span className="eyebrow">BATCH OVERVIEW</span>
          <h2 id="results-title">
            Your results<span className="count-pill">{rows.length}</span>
          </h2>
        </div>
        <span className="quiet-meta">
          {ignored > 0
            ? `${ignored} blank line${ignored === 1 ? "" : "s"} ignored · `
            : ""}
          {rows.filter((r) => r.duplicateOf).length} duplicate rows
        </span>
      </div>
      {stale && (
        <div className="banner warning" role="status">
          <Info size={18} />
          Results are outdated. Check identifiers again to update them.
        </div>
      )}
      <div className="summary-grid" aria-live="polite">
        <div>
          <span className="summary-icon blue">
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong>{rows.length}</strong>
            <span>Identifiers checked</span>
          </div>
        </div>
        <div>
          <span className="summary-icon green">
            <CheckCircle2 size={19} />
          </span>
          <div>
            <strong>{validCount}</strong>
            <span>Valid format</span>
          </div>
        </div>
        <div>
          <span className="summary-icon red">
            <AlertCircle size={19} />
          </span>
          <div>
            <strong>{invalidCount}</strong>
            <span>Invalid inputs</span>
          </div>
        </div>
        <div>
          <span className="summary-icon amber">
            <Info size={19} />
          </span>
          <div>
            <strong>{warnings}</strong>
            <span>Code warnings</span>
          </div>
        </div>
      </div>
      <div className="results-card">
        <div className="results-toolbar">
          <div className="filter-group">
            <label className="select-wrap">
              <span className="sr-only">Format filter</span>
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All formats</option>
                <option value="valid">Valid format</option>
                <option value="invalid">Invalid format</option>
                <option value="warnings">Code warnings</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <label className="select-wrap">
              <span className="sr-only">Entity filter</span>
              <select
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All entities ({rows.length})</option>
                <option value="Company">
                  Companies ({rows.filter((r) => r.entity === "Company").length}
                  )
                </option>
                <option value="LLP">
                  LLPs ({rows.filter((r) => r.entity === "LLP").length})
                </option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
          <div className="export-group">
            <button
              className="small-button"
              disabled={stale || !filtered.length}
              onClick={() => downloadCsv(filtered, registry)}
            >
              <ArrowDownToLine size={15} />
              Export filtered
            </button>
            <button
              className="small-button"
              disabled={stale}
              onClick={() => downloadCsv(rows, registry)}
            >
              Export all
            </button>
          </div>
        </div>
        <div className="lookup-toolbar">
          <div>
            <Search size={16} />
            <span>
              {selected.size
                ? `${selected.size} selected`
                : "Select rows for registry lookup"}
              <small>Up to 10 unique identifiers · sandbox samples only</small>
            </span>
          </div>
          <button
            className="button primary compact"
            disabled={disabled || !selected.size}
            onClick={() => onLookup([...selected])}
          >
            {busy ? <span className="spinner" /> : <Search size={15} />}{" "}
            {busy ? "Looking up…" : "Look up selected"}
          </button>
        </div>
        {notice && (
          <p className="selection-notice" role="status">
            {notice}
          </p>
        )}
        <div className="desktop-results">
          <table>
            <caption className="sr-only">
              Identifier validation results. Expand a row for explanations.
            </caption>
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Select</span>
                </th>
                <th>Line</th>
                <th>Identifier</th>
                <th>Format</th>
                <th>Entity</th>
                <th>Listing</th>
                <th>State</th>
                <th>Incorporated</th>
                <th>Type</th>
                <th>Registry</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const v = values(r);
                const open = expanded.has(r.line);
                return (
                  <Fragment key={r.line}>
                    <tr className={open ? "row-expanded" : ""}>
                      <td>{selection(r)}</td>
                      <td className="line-cell">{r.line}</td>
                      <td>
                        <code className="identifier-code">{r.normalized}</code>
                        {r.duplicateOf && (
                          <small className="duplicate">
                            Duplicate of line {r.duplicateOf}
                          </small>
                        )}
                        {!r.valid && (
                          <small className="inline-error">
                            {r.errors[0]?.message}
                          </small>
                        )}
                      </td>
                      <td>{formatBadge(r)}</td>
                      <td>
                        <span
                          className={`entity-label ${r.entity === "LLP" ? "llp" : ""}`}
                        >
                          {r.entity}
                        </span>
                      </td>
                      <td>{v.listing}</td>
                      <td>{v.state}</td>
                      <td>{v.year}</td>
                      <td className="type-cell">{v.type}</td>
                      <td>
                        <span
                          className={`registry-state ${registry[r.normalized]?.state === "found" ? "found" : ""}`}
                        >
                          {
                            registryLabels[
                              registry[r.normalized]?.state ?? "not_checked"
                            ]
                          }
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`${open ? "Hide" : "Show"} details for line ${r.line}`}
                          aria-expanded={open}
                          aria-controls={`desktop-details-${r.line}`}
                          onClick={() => expand(r.line)}
                        >
                          {open ? (
                            <ChevronUp size={17} />
                          ) : (
                            <ChevronDown size={17} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={11} className="details-cell">
                          <ResultDetails
                            disclosureId={`desktop-details-${r.line}`}
                            row={r}
                            lookup={registry[r.normalized]}
                            onRetry={() => onLookup([r.normalized], true)}
                            disabled={disabled}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mobile-results">
          {visible.map((r) => {
            const v = values(r);
            const open = expanded.has(r.line);
            return (
              <article className="mobile-result" key={r.line}>
                <div className="mobile-row-top">
                  <label>
                    {selection(r)}
                    <span>Line {r.line}</span>
                  </label>
                  {formatBadge(r)}
                </div>
                <code className="identifier-code">{r.normalized}</code>
                {r.duplicateOf && (
                  <small className="duplicate">
                    Duplicate of line {r.duplicateOf}
                  </small>
                )}
                {!r.valid && (
                  <p className="inline-error">{r.errors[0]?.message}</p>
                )}
                <dl className="mobile-fields">
                  {[
                    ["Entity", r.entity],
                    ["Listing", v.listing],
                    ["State", v.state],
                    ["Incorporated", v.year],
                    ["Type", v.type],
                    [
                      "Registry",
                      registryLabels[
                        registry[r.normalized]?.state ?? "not_checked"
                      ],
                    ],
                  ].map(([k, val]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{val}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  className="text-button"
                  aria-expanded={open}
                  aria-controls={`mobile-details-${r.line}`}
                  onClick={() => expand(r.line)}
                >
                  {open ? "Hide details" : "View details"}
                  {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {open && (
                  <ResultDetails
                    disclosureId={`mobile-details-${r.line}`}
                    row={r}
                    lookup={registry[r.normalized]}
                    onRetry={() => onLookup([r.normalized], true)}
                    disabled={disabled}
                  />
                )}
              </article>
            );
          })}
        </div>
        {!filtered.length && (
          <div className="no-results">
            <Search size={25} />
            <h3>No matching results</h3>
            <p>Change the filters to see more of your batch.</p>
          </div>
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 50 + 1}–${Math.min(currentPage * 50, filtered.length)} of ${filtered.length}`
              : "0 results"}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <p className="results-footnote">
        <Info size={14} />
        Format checks explain an identifier’s structure. They do not verify
        registration, ownership today, or regulatory compliance.
      </p>
    </section>
  );
}
