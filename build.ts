import { cp, mkdir, readdir, rm, watch } from "node:fs/promises";
import { join } from "node:path";

const root = import.meta.dir;
const out = join(root, "dist");
const FONT_URL = "chrome-extension://__MSG_@@extension_id__/fonts/";

const fontPackages = ["@fontsource-variable/inter", "@fontsource-variable/source-serif-4"];
const fontSheets = ["wght.css", "wght-italic.css"];
const fontSubsets = /-(latin|latin-ext)-wght-/;

/** Icons used from CSS, as mask images. Lucide, ISC licence. */
const cssIcons: Record<string, { file: string; filled?: boolean }> = {
  up: { file: "arrow-big-up" },
  "up-fill": { file: "arrow-big-up", filled: true },
  reply: { file: "message-circle" },
};

async function fontFaces(): Promise<string> {
  await mkdir(join(out, "fonts"), { recursive: true });
  const faces: string[] = [];
  for (const pkg of fontPackages) {
    const dir = join(root, "node_modules", pkg);
    for (const sheet of fontSheets) {
      const css = await Bun.file(join(dir, sheet)).text();
      for (const face of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
        const file = face.match(/url\(\.\/files\/([^)]+\.woff2)\)/)?.[1];
        if (!file || !fontSubsets.test(file)) continue;
        await cp(join(dir, "files", file), join(out, "fonts", file));
        faces.push(face.replace(/url\(\.\/files\//, `url(${FONT_URL}`));
      }
    }
  }
  return faces.join("\n");
}

async function iconVariables(): Promise<string> {
  const lines = await Promise.all(
    Object.entries(cssIcons).map(async ([name, { file, filled }]) => {
      const path = join(root, "node_modules/lucide-static/icons", `${file}.svg`);
      let svg = (await Bun.file(path).text()).replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").trim();
      if (filled) svg = svg.replace('fill="none"', 'fill="black"');
      return `  --phn-i-${name}: url("data:image/svg+xml,${encodeURIComponent(svg)}");`;
    }),
  );
  return `html.phn {\n${lines.join("\n")}\n}`;
}

async function styles(): Promise<void> {
  const dir = join(root, "src/styles");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".css")).sort();
  const sheets = await Promise.all(files.map((f) => Bun.file(join(dir, f)).text()));
  await Bun.write(join(out, "content.css"), [await fontFaces(), await iconVariables(), ...sheets].join("\n\n"));
}

async function scripts(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(root, "src/early.ts"), join(root, "src/content.ts")],
    outdir: out,
    target: "browser",
    format: "iife",
    minify: false,
  });
  if (!result.success) throw new AggregateError(result.logs, "Script build failed");
}

async function build(): Promise<void> {
  await mkdir(out, { recursive: true });
  await Promise.all([
    styles(),
    scripts(),
    cp(join(root, "src/manifest.json"), join(out, "manifest.json")),
    cp(join(root, "src/assets/icons"), join(out, "icons"), { recursive: true }),
    cp(join(root, "LICENSE"), join(out, "LICENSE")),
    cp(join(root, "THIRD_PARTY_NOTICES.md"), join(out, "THIRD_PARTY_NOTICES.md")),
  ]);
  console.log(`Built ${out}`);
}

await rm(out, { recursive: true, force: true });
await build();
if (process.argv.includes("--watch")) {
  for await (const _ of watch(join(root, "src"), { recursive: true })) {
    await build().catch((error) => console.error(error));
  }
}
