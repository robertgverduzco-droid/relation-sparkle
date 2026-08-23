/**
 * Athena University — corpus indexer.
 *
 * Reads the canonical educational corpus from docs/education/ (the source of
 * truth), splits it into structure-respecting semantic chunks, embeds every
 * chunk through the Lovable AI Gateway, and writes derived runtime artefacts:
 *
 *   src/lib/education/corpus.json    chunk text + provenance
 *   src/lib/education/vectors.json   int8-quantised dense vectors
 *
 * Run with:  bun run scripts/build-education-index.ts
 * Offline:   bun run scripts/build-education-index.ts --no-embed
 *
 * The artefacts are derived infrastructure. The markdown documents remain
 * canonical; regenerate after any educational document changes.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const EDU = join(ROOT, "docs/education");
const OUT_DIR = join(ROOT, "src/lib/education");

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 512;
const MAX_CHUNK = 1500;
const MIN_CHUNK = 320;

type Kind = "university" | "integration" | "college" | "faculty";

export type RawChunk = {
  id: string;
  doc: string;
  docTitle: string;
  kind: Kind;
  heading: string;
  text: string;
  /** Provenance metadata — withheld from ordinary prompts, used on demand. */
  college?: string;
  scholar?: string;
  role?: string;
};

function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(dir, f))
    .sort();
}

function classify(path: string): Kind {
  if (path.includes("/faculty/")) return "faculty";
  if (path.includes("/colleges/")) return "college";
  if (path.endsWith("final-integration.md")) return "integration";
  return "university";
}

function frontmatter(src: string): Record<string, string> {
  if (!src.startsWith("---")) return {};
  const end = src.indexOf("\n---", 3);
  if (end === -1) return {};
  const out: Record<string, string> = {};
  for (const line of src.slice(3, end).split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/i);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

function stripFrontmatter(src: string): string {
  if (!src.startsWith("---")) return src;
  const end = src.indexOf("\n---", 3);
  return end === -1 ? src : src.slice(end + 4);
}

function titleOf(src: string, fallback: string): string {
  const m = src.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}


/** Split a document into (heading-path, body) sections at ## / ### boundaries. */
function sections(src: string): { heading: string; body: string }[] {
  const lines = src.split("\n");
  const out: { heading: string; body: string }[] = [];
  let h2 = "";
  let h3 = "";
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) out.push({ heading: [h2, h3].filter(Boolean).join(" › "), body });
    buf = [];
  };

  for (const line of lines) {
    const m2 = line.match(/^##\s+(.+)$/);
    const m3 = line.match(/^###\s+(.+)$/);
    if (m2) {
      flush();
      h2 = m2[1].trim();
      h3 = "";
      continue;
    }
    if (m3) {
      flush();
      h3 = m3[1].trim();
      continue;
    }
    if (/^#\s+/.test(line)) continue;
    buf.push(line);
  }
  flush();
  return out;
}

/** Split an over-long section at paragraph boundaries, with one-paragraph overlap. */
function packParagraphs(body: string): string[] {
  const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  let len = 0;
  for (const p of paras) {
    if (len + p.length > MAX_CHUNK && cur.length) {
      out.push(cur.join("\n\n"));
      const overlap = cur[cur.length - 1];
      cur = overlap.length < 400 ? [overlap] : [];
      len = cur.reduce((n, s) => n + s.length, 0);
    }
    cur.push(p);
    len += p.length;
  }
  if (cur.length) out.push(cur.join("\n\n"));
  return out;
}

export function chunkDocument(path: string, src: string): RawChunk[] {
  const rel = relative(ROOT, path).replace(/\\/g, "/");
  const kind = classify(rel);
  const clean = stripFrontmatter(src);
  const docTitle = titleOf(clean, rel.split("/").pop()!.replace(/\.md$/, ""));
  const chunks: RawChunk[] = [];

  for (const s of sections(clean)) {
    for (const piece of packParagraphs(s.body)) {
      const prev = chunks[chunks.length - 1];
      // Merge fragments too small to stand as an idea back into their sibling.
      if (piece.length < MIN_CHUNK && prev && prev.heading === s.heading) {
        prev.text = `${prev.text}\n\n${piece}`;
        continue;
      }
      chunks.push({
        id: `${rel}#${chunks.length}`,
        doc: rel,
        docTitle,
        kind,
        heading: s.heading,
        text: piece,
      });
    }
  }
  return chunks.filter((c) => c.text.length >= 120);
}

function collect(): RawChunk[] {
  const files = [
    join(EDU, "athena-university.md"),
    join(EDU, "final-integration.md"),
    ...listMarkdown(join(EDU, "colleges")),
    ...listMarkdown(join(EDU, "faculty")),
  ].filter((f) => existsSync(f) && !f.endsWith("README.md"));

  return files.flatMap((f) => chunkDocument(f, readFileSync(f, "utf8")));
}

function embedText(c: RawChunk): string {
  return `${c.docTitle}${c.heading ? ` — ${c.heading}` : ""}\n${c.text}`;
}

async function embedAll(chunks: RawChunk[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is required to embed the corpus");
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += 64) {
    const batch = chunks.slice(i, i + 64);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBED_MODEL,
        dimensions: EMBED_DIMS,
        input: batch.map(embedText),
      }),
    });
    if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    for (const d of body.data.sort((a, b) => a.index - b.index)) vectors.push(d.embedding);
    process.stdout.write(`  embedded ${Math.min(i + 64, chunks.length)}/${chunks.length}\n`);
  }
  return vectors;
}

/** int8 quantisation of L2-normalised vectors — 512 bytes per chunk. */
function quantise(vectors: number[][]): string {
  const dims = vectors[0].length;
  const bytes = new Int8Array(vectors.length * dims);
  vectors.forEach((v, r) => {
    const norm = Math.hypot(...v) || 1;
    for (let d = 0; d < dims; d++) {
      bytes[r * dims + d] = Math.max(-127, Math.min(127, Math.round((v[d] / norm) * 127)));
    }
  });
  return Buffer.from(bytes.buffer).toString("base64");
}

async function main() {
  const chunks = collect();
  console.log(`chunks: ${chunks.length} from ${new Set(chunks.map((c) => c.doc)).size} documents`);
  mkdirSync(OUT_DIR, { recursive: true });

  writeFileSync(
    join(OUT_DIR, "corpus.json"),
    JSON.stringify({ generatedFrom: "docs/education", chunks }, null, 0),
  );

  if (process.argv.includes("--no-embed")) {
    console.log("skipped embeddings (--no-embed)");
    return;
  }

  const vectors = await embedAll(chunks);
  writeFileSync(
    join(OUT_DIR, "vectors.json"),
    JSON.stringify({
      model: EMBED_MODEL,
      dims: EMBED_DIMS,
      count: chunks.length,
      ids: chunks.map((c) => c.id),
      int8: quantise(vectors),
    }),
  );
  console.log(`wrote ${vectors.length} vectors (${EMBED_DIMS}d, int8)`);
}

if (import.meta.main) await main();
