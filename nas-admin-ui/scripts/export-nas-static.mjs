import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("dist/client");
const target = resolve("nas-static");
const renderUrl = process.env.NAS_RENDER_URL || "http://127.0.0.1:3001/";

const response = await fetch(renderUrl);
if (!response.ok) {
  throw new Error(`Could not render NAS dashboard: ${response.status}`);
}

const html = await response.text();
if (!html.includes("写真NAS セットアップ")) {
  throw new Error("Rendered dashboard did not contain the expected title");
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await writeFile(resolve(target, "index.html"), html, "utf8");

console.log(`NAS static dashboard exported to ${target}`);
