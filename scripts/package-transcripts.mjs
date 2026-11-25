import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const rootId = "01a2124a-a875-7ad1-b7d3-f8837e0189ae";
const sessionRoot = path.join(os.homedir(), ".codex", "sessions");
const projectRoot = path.resolve(import.meta.dirname, "..");
const output = path.join(projectRoot, "submission", "transcripts");
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}
async function metadata(file) {
  const stream = createReadStream(file, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      return JSON.parse(line).payload;
    }
  } catch {
    return null;
  } finally {
    lines.close();
    stream.destroy();
  }
}
const candidates = [];
for (const file of await walk(sessionRoot)) {
  const meta = await metadata(file);
  if (meta?.id) candidates.push({ file, meta });
}
const ids = new Set([rootId]);
let changed = true;
while (changed) {
  changed = false;
  for (const { meta } of candidates) {
    const parent =
      meta.source?.subagent?.thread_spawn?.parent_thread_id ??
      meta.forked_from_id;
    if (parent && ids.has(parent) && !ids.has(meta.id)) {
      ids.add(meta.id);
      changed = true;
    }
  }
}
await fs.mkdir(output, { recursive: true });
const manifest = [];
for (const { file, meta } of candidates.filter((x) => ids.has(x.meta.id))) {
  const bytes = await fs.readFile(file);
  const name = path.basename(file);
  await fs.writeFile(path.join(output, name), bytes);
  manifest.push({
    id: meta.id,
    file: name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
if (!manifest.some((x) => x.id === rootId))
  throw new Error(
    "Root conversation log was not found; refusing an incomplete package.",
  );
await fs.writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      rootId,
      sessions: manifest,
      note: "Original JSONL bytes preserved; includes the test key supplied in chat. Rotate before sharing.",
    },
    null,
    2,
  ),
);
const archive = path.join(
  projectRoot,
  "submission",
  "filesure-ai-transcripts.zip",
);
if (process.platform === "win32")
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Compress-Archive -LiteralPath $env:FILESURE_TRANSCRIPT_SOURCE -DestinationPath $env:FILESURE_TRANSCRIPT_ARCHIVE -Force",
    ],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        FILESURE_TRANSCRIPT_SOURCE: output,
        FILESURE_TRANSCRIPT_ARCHIVE: archive,
      },
    },
  );
else
  execFileSync("zip", ["-r", archive, "transcripts"], {
    cwd: path.dirname(output),
    stdio: "pipe",
  });
console.log(
  `Preserved ${manifest.length} unedited sessions. Archive: ${archive}`,
);
console.log(
  "Snapshot taken before this command finishes; rerun after any further AI sessions. Rotate the chat-supplied key before sharing.",
);
