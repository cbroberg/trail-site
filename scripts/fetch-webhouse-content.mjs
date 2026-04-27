/**
 * Fetches published content from webhouse.app → content/ directory.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.WEBHOUSE_URL ?? "https://webhouse.app";
const JWT = process.env.WEBHOUSE_JWT;
const ORG = process.env.WEBHOUSE_ORG ?? "broberg-ai";
const SITE = process.env.WEBHOUSE_SITE ?? "trail";
const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

if (!JWT) { console.error("WEBHOUSE_JWT is required"); process.exit(1); }

const COOKIE = `cms-session=${JWT}; cms-active-org=${ORG}; cms-active-site=${SITE}`;

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const COLLECTIONS = ["posts", "pages", "categories", "global"];
console.log(`Fetching from ${BASE} (org:${ORG} site:${SITE})`);

for (const col of COLLECTIONS) {
  const dir = join(CONTENT_DIR, col);
  mkdirSync(dir, { recursive: true });
  try {
    const data = await fetchJson(`/api/cms/${col}?limit=500`);
    const docs = Array.isArray(data) ? data : (data.documents ?? data.docs ?? []);
    let n = 0;
    for (const doc of docs) {
      const slug = doc.slug ?? doc.id;
      if (!slug) continue;
      writeFileSync(join(dir, `${slug}.json`), JSON.stringify(doc, null, 2));
      n++;
    }
    console.log(`  ${col}: ${n} docs`);
  } catch (err) {
    console.warn(`  ${col}: SKIP (${err.message})`);
  }
}
console.log("Content fetched →", CONTENT_DIR);
