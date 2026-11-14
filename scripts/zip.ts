/** Packs dist/ into the zip the Chrome Web Store and Edge Add-ons accept, without needing a system zip tool. */
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { zipSync } from "fflate";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const { name } = await Bun.file(join(root, "package.json")).json();

const files: Record<string, Uint8Array> = {};
for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const path = join(entry.parentPath, entry.name);
  files[relative(dist, path)] = new Uint8Array(await Bun.file(path).arrayBuffer());
}
const out = join(root, `${name}.zip`);
await Bun.write(out, zipSync(files, { level: 9 }));
console.log(`Wrote ${out} (${Object.keys(files).length} files)`);
