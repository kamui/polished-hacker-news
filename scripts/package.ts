/**
 * Writes everything a release needs to release/: the store zip named for the version, the
 * store images, and notes.md taken from that version's CHANGELOG section. Run after the
 * version bump is committed; it builds first, and refuses to package mismatched versions,
 * a version the changelog doesn't describe, a comparison link that doesn't end at the
 * version's tag, or uncommitted changes.
 */
import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { zipDist } from "./zip";

const root = join(import.meta.dir, "..");
const out = join(root, "release");
const storeImages = ["store-icon-128.png", "promo-small-440x280.png"];

function fail(message: string): never {
  console.error(`package: ${message}`);
  process.exit(1);
}

async function run(...cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { cwd: root, stdout: "pipe", stderr: "inherit" });
  const text = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) fail(`${cmd.join(" ")} failed`);
  return text.trim();
}

const { name, version } = await Bun.file(join(root, "package.json")).json();
const manifest = await Bun.file(join(root, "src/manifest.json")).json();
if (manifest.version !== version) fail(`package.json is ${version} but src/manifest.json is ${manifest.version}`);

const changelog = await Bun.file(join(root, "CHANGELOG.md")).text();
const section = changelog.split(/^## /m).find((part) => part.startsWith(`${version} (`));
if (!section) fail(`CHANGELOG.md has no "## ${version} (date)" section`);
const body = section.split("\n").slice(1);
const compare = body.find((line) => line.startsWith("[Changes since"));
if (compare && !compare.endsWith(`...v${version})`)) fail(`CHANGELOG.md's ${version} comparison link must end at v${version}: ${compare}`);
const changes = body
  .filter((line) => !line.startsWith("[Release](") && line !== compare)
  .join("\n")
  .trim();

if (await run("git", "status", "--porcelain")) fail("commit or stash your changes first, so the zip matches a commit");
const commit = await run("git", "rev-parse", "--short", "HEAD");

await run("bun", "run", "build.ts");
await rm(out, { recursive: true, force: true });
await mkdir(out);

const zip = join(out, `${name}-${version}.zip`);
const count = await zipDist(zip);
const packed = unzipSync(new Uint8Array(await Bun.file(zip).arrayBuffer()), { filter: (file) => file.name === "manifest.json" });
const packedVersion = JSON.parse(new TextDecoder().decode(packed["manifest.json"])).version;
if (packedVersion !== version) fail(`the zip's manifest says ${packedVersion}, expected ${version}`);

for (const image of storeImages) await copyFile(join(root, "store", image), join(out, image));

await Bun.write(
  join(out, "notes.md"),
  `${changes}
${compare ? `\n${compare}\n` : ""}
${storeImages.map((image) => `\`${image}\``).join(" and ")} are the images for the store listing; they are not needed to use the extension.

**Install.** Until the store listings are approved, download \`${name}-${version}.zip\`, unzip it, open \`chrome://extensions\` (or \`edge://extensions\`), turn on Developer mode, choose **Load unpacked** and select the unzipped folder.
`,
);

console.log(`Packaged ${version} from ${commit} in release/:`);
console.log(`  ${name}-${version}.zip (${count} files)`);
for (const file of [...storeImages, "notes.md"]) console.log(`  ${file}`);
