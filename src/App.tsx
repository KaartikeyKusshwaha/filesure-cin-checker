import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Info,
  Layers,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { checkBatch, currentIndiaYear } from "./domain/checker.js";
import { EXAMPLES } from "./domain/reference.js";
import type { AppConfig, BatchResult, RegistryResult } from "./domain/types.js";
import { RegistryClient } from "./registry/client.js";
import { Results } from "./components/Results.js";
const emptyConfig: AppConfig = {
  mode: "unconfigured",
  samples: [],
  message: "Registry availability is being checked.",
};
export default function App() {
  const [input, setInput] = useState("");
  const [checkedInput, setCheckedInput] = useState("");
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<AppConfig>(emptyConfig);
  const [registry, setRegistry] = useState<Record<string, RegistryResult>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const client = useRef<RegistryClient | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [guide, setGuide] = useState(false);
  if (!client.current) client.current = new RegistryClient();
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/config", { signal: c.signal })
      .then((r) => r.json())
      .then((v: AppConfig) => {
        if (
          ["sandbox", "unconfigured"].includes(v.mode) &&
          Array.isArray(v.samples)
        )
          setConfig(v);
        else throw new Error();
      })
      .catch(() => {
        if (!c.signal.aborted)
          setConfig({
            mode: "unconfigured",
            samples: [],
            message: "Registry lookup is unavailable. Local checking is ready.",
          });
      });
    return () => {
      c.abort();
      controller.current?.abort();
    };
  }, []);
  const count = input.split(/\r\n|\r|\n/).filter((x) => x.trim()).length;
  const stale = !!batch?.rows.length && input !== checkedInput;
  function cancel() {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setRegistry((old) =>
      Object.fromEntries(
        Object.entries(old).map(([id, v]) => [
          id,
          v.state === "loading"
            ? { state: "not_checked", message: "Lookup cancelled." }
            : v,
        ]),
      ),
    );
  }
  function edit(value: string) {
    cancel();
    setInput(value);
    setError("");
  }
  function check() {
    cancel();
    const start = performance.now();
    const next = checkBatch(input, currentIndiaYear());
    setElapsed(performance.now() - start);
    setBatch(next);
    setCheckedInput(input);
    setError(next.error ?? "");
    setRegistry({});
    setSelected(new Set());
    setRun((n) => n + 1);
    if (next.error) textarea.current?.focus();
  }
  function clear() {
    cancel();
    setInput("");
    setCheckedInput("");
    setBatch(null);
    setRegistry({});
    setSelected(new Set());
    setError("");
    textarea.current?.focus();
  }
  async function lookup(ids: string[], refresh = false) {
    if (stale || busy || config.mode !== "sandbox") return;
    const eligible = [...new Set(ids)]
      .filter((id) => batch?.rows.some((r) => r.normalized === id && r.valid))
      .slice(0, 10);
    if (!eligible.length) return;
    cancel();
    const token = generation.current;
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setRegistry((old) => ({
      ...old,
      ...Object.fromEntries(
        eligible.map((id) => [
          id,
          { state: "loading", message: "Looking up registry record…" },
        ]),
      ),
    }));
    await client.current!.lookupSelected(
      eligible,
      c.signal,
      (id, result) => {
        if (token === generation.current)
          setRegistry((old) => ({ ...old, [id]: result }));
      },
      refresh,
    );
    if (token === generation.current) setBusy(false);
  }
  return (
    <>
      <a className="skip-link" href="#checker">
        Skip to checker
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="#" className="brand" aria-label="FileSure checker home">
            <span className="brand-mark">
              <FileCheck2 size={23} strokeWidth={2.2} />
            </span>
            <span>
              File<span className="brand-blue">Sure</span>
              <sup>®</sup>
            </span>
          </a>
          <div className="header-divider" />
          <span className="header-product">CIN & LLPIN Checker</span>
          <nav aria-label="Page navigation">
            <a href="#how-it-works">
              <BookOpen size={16} />
              How it works
            </a>
            <span className="free-label">
              <span />
              Free tool
            </span>
          </nav>
        </div>
      </header>
      <main>
        <section className="intro">
          <div className="intro-kicker">
            <span className="mini-icon">
              <FileCheck2 size={14} />
            </span>{" "}
            THE DETAILS BEHIND THE DIGITS
          </div>
          <h1>
            Understand every
            <br className="mobile-break" /> <span>company identifier.</span>
          </h1>
          <p>
            Check CINs and LLPINs in one go. Decode the details,
            <br className="desktop-break" /> spot mistakes, and move forward
            with confidence.
          </p>
          <div className="trust-row">
            <span>
              <Check size={14} />
              Up to 500 at once
            </span>
            <span>
              <Check size={14} />
              No sign-up
            </span>
            <span>
              <Check size={14} />
              Private by default
            </span>
          </div>
        </section>
        <div className="workspace" id="checker">
          <section className="input-card" aria-labelledby="input-title">
            <div className="card-topline">
              <div>
                <span className="step-dot">
                  <Layers size={16} />
                </span>
                <h2 id="input-title">Check your identifiers</h2>
              </div>
              <span className="small-tag">CIN + LLPIN</span>
            </div>
            <div className="input-label-row">
              <label htmlFor="identifiers">Paste your identifiers</label>
              <button
                className="text-button"
                onClick={() => {
                  edit(EXAMPLES.join("\n"));
                  textarea.current?.focus();
                }}
              >
                <Sparkles size={14} />
                Try examples
              </button>
            </div>
            <div className={`textarea-shell ${error ? "has-error" : ""}`}>
              <textarea
                id="identifiers"
                ref={textarea}
                value={input}
                onChange={(e) => edit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    check();
                  }
                }}
                placeholder={"L17110MH1973PLC019786\nAAA-1234"}
                spellCheck={false}
                autoCapitalize="characters"
                autoCorrect="off"
                aria-describedby="input-hint input-error"
                aria-invalid={!!error}
              />
            </div>
            <div className="input-meta" id="input-hint">
              <span>One identifier per line</span>
              <span className={count > 500 ? "over-limit" : ""}>
                {count} / 500 identifiers
              </span>
            </div>
            {error && (
              <div className="input-error" id="input-error" role="alert">
                <Info size={16} />
                {error}
              </div>
            )}
            <div className="input-actions">
              <button className="button primary" onClick={check}>
                <Search size={18} />
                Check identifiers<kbd>⌘ / Ctrl ↵</kbd>
              </button>
              <button className="button secondary" onClick={clear}>
                Clear
              </button>
            </div>
            <div className="privacy-note">
              <LockKeyhole size={14} />
              <p>
                Format checks stay on your device. Only identifiers you select
                for registry lookup are sent to FileSure.
              </p>
            </div>
          </section>
          <aside className="guide-card" aria-labelledby="guide-title">
            <div className="guide-header">
              <span className="guide-icon">
                <FileCheck2 size={22} />
              </span>
              <span>KNOW WHAT YOU’RE CHECKING</span>
            </div>
            <h2 id="guide-title">
              A small code.
              <br />A lot of information.
            </h2>
            <p>
              A CIN tells a company’s story in 21 characters. Here’s how to read
              one.
            </p>
            <div className="cin-visual" aria-label="CIN segments">
              <span>L</span>
              <span>17110</span>
              <span>MH</span>
              <span>1973</span>
              <span>PLC</span>
              <span>019786</span>
            </div>
            <div className="guide-legend">
              {[
                ["Listed or unlisted", "L / U"],
                ["Industry", "5 digits"],
                ["State", "2 letters"],
                ["Incorporated", "4 digits"],
                ["Company type", "3 letters"],
                ["Registration", "6 digits"],
              ].map(([label, value], i) => (
                <div key={label}>
                  <span>
                    <i className={`legend-dot dot-${i}`} />
                    {label}
                  </span>
                  <small>{value}</small>
                </div>
              ))}
            </div>
            <div className="llp-note">
              <Info size={16} />
              <p>
                <strong>Checking an LLP?</strong> An LLPIN looks like{" "}
                <code>AAA-1234</code>. Its state and year need registry data.
              </p>
            </div>
          </aside>
        </div>
        <div
          className={`sandbox-banner ${config.mode === "sandbox" ? "ready" : ""}`}
        >
          <div className="sandbox-icon">
            <ShieldCheck size={19} />
          </div>
          <div>
            <strong>
              {config.mode === "sandbox"
                ? "Registry lookup · sandbox mode"
                : "Registry lookup · not connected"}
            </strong>
            <p>
              {config.mode === "sandbox"
                ? "Optional registry checks are available for supported sample records. Format checks work for any CIN or LLPIN."
                : config.message}
            </p>
          </div>
          {config.mode === "sandbox" && config.samples.length > 0 && (
            <button
              className="text-button"
              onClick={() => {
                edit(config.samples.join("\n"));
                textarea.current?.focus();
              }}
            >
              Use registry samples
            </button>
          )}
        </div>
        {batch && batch.rows.length > 0 ? (
          <>
            <Results
              key={run}
              rows={batch.rows}
              ignored={batch.ignoredBlankLines}
              stale={stale}
              registry={registry}
              selected={selected}
              setSelected={setSelected}
              onLookup={lookup}
              busy={busy}
              configured={config.mode === "sandbox"}
            />
            <span className="sr-only" aria-live="polite">
              {batch.rows.length} identifiers checked in {Math.round(elapsed)}{" "}
              milliseconds.
            </span>
          </>
        ) : (
          <section className="feature-row" aria-label="Checker benefits">
            <div>
              <ShieldCheck size={21} />
              <h3>Clarity, line by line</h3>
              <p>Know exactly what’s valid and what needs fixing.</p>
            </div>
            <div>
              <Layers size={21} />
              <h3>Built for your whole list</h3>
              <p>Check a single identifier or a batch of 500.</p>
            </div>
            <div>
              <ArrowDownToLine size={21} />
              <h3>Ready for your workflow</h3>
              <p>Filter your results and take them with you as CSV.</p>
            </div>
          </section>
        )}
        <section className="how-section" id="how-it-works">
          <button
            className="how-toggle"
            aria-expanded={guide}
            onClick={() => setGuide(!guide)}
          >
            <span>
              <BookOpen size={18} />A few things worth knowing
            </span>
            <ChevronDown size={18} className={guide ? "rotate" : ""} />
          </button>
          {guide && (
            <div className="how-content">
              <div>
                <h3>Format is a first check</h3>
                <p>
                  A well-formed identifier does not prove registration, current
                  status, or compliance. Registry results are shown separately.
                </p>
              </div>
              <div>
                <h3>Older codes still matter</h3>
                <p>
                  Legacy state codes and ROC-specific codes are supported.
                  Unknown alphabetic codes receive a verification warning rather
                  than a made-up answer.
                </p>
              </div>
              <div>
                <h3>Sandbox means sample records</h3>
                <p>
                  Registry lookup uses FileSure’s free sandbox. Identifiers
                  outside its sample set can still be checked and decoded
                  locally.
                </p>
              </div>
              <a
                href="https://www.mospi.gov.in/sites/default/files/publication_reports/ASI/ASI_Manual_2022-23.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Read the government CIN format reference
              </a>
            </div>
          )}
        </section>
      </main>
      <footer className="site-footer">
        <span>
          <FileCheck2 size={16} />
          <strong>FileSure</strong>
          <span className="footer-divider">/</span>Assignment project
        </span>
        <span>
          Made for the details that matter.
          <a
            href="https://github.com/KaartikeyKusshwaha/filesure-cin-checker"
            target="_blank"
            rel="noreferrer"
          >
            View source
          </a>
        </span>
      </footer>
    </>
  );
}
