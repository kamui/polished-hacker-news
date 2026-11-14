/**
 * Renders the extension icons and the store images from the SVGs in src/assets: the full tin
 * (icon.svg) for 128px and up, a simplified one (icon-small.svg) below that, the bare lid
 * (icon-tiny.svg) at 16px, and the store's small promo tile (promo-small.svg). Needs a Chromium
 * for playwright-core.
 */
import { join } from "node:path";
import { zlibSync } from "fflate";
import { chromium } from "playwright-core";

const root = join(import.meta.dir, "..");
const assets = join(root, "src/assets");
const inter = join(root, "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");
const fontFace = `<style>@font-face{font-family:Inter;font-weight:100 900;src:url(data:font/woff2;base64,${Buffer.from(await Bun.file(inter).arrayBuffer()).toString("base64")})}</style>`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();

/** Lays the SVG out centred in a transparent page, with its lettering's font embedded in it. */
async function render(file: string, width: number, height: number, artwork = width): Promise<void> {
  const svg = (await Bun.file(join(assets, file)).text()).replace(/(<svg[^>]*>)/, `$1${fontFace}`);
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent;display:grid;place-items:center;height:100vh}svg{display:block;width:${artwork}px}</style>${svg}`,
  );
  await page.evaluate(() => document.fonts.load("900 16px Inter"));
}

for (const size of [16, 32, 48, 96]) {
  await render(size === 16 ? "icon-tiny.svg" : "icon-small.svg", size, size);
  await page.screenshot({ path: join(assets, "icons", `icon-${size}.png`), omitBackground: true });
}
// The Chrome Web Store wants a round 128px icon's artwork about 112px across, inside transparent padding.
await render("icon.svg", 128, 128, 112);
await page.screenshot({ path: join(assets, "icons", "icon-128.png"), omitBackground: true });
await Bun.write(join(root, "store/store-icon-128.png"), Bun.file(join(assets, "icons/icon-128.png")));
await render("icon.svg", 300, 300);
await page.screenshot({ path: join(root, "store/logo-300.png"), omitBackground: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** The store rejects promo tiles with an alpha channel, and Chromium's screenshots always have one. */
function rgbPng(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      raw.set(rgba.subarray((y * width + x) * 4, (y * width + x) * 4 + 3), y * (1 + width * 3) + 1 + x * 3);
    }
  }
  const header = new Uint8Array(13);
  new DataView(header.buffer).setUint32(0, width);
  new DataView(header.buffer).setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlibSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ];
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  parts.reduce((offset, part) => (png.set(part, offset), offset + part.length), 0);
  return png;
}

await render("promo-small.svg", 440, 280);
const pixels = await page.evaluate(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 440;
  canvas.height = 280;
  const context = canvas.getContext("2d")!;
  const image = new Image();
  image.src = `data:image/svg+xml,${encodeURIComponent(document.querySelector("svg")!.outerHTML)}`;
  await image.decode();
  context.drawImage(image, 0, 0, 440, 280);
  return [...context.getImageData(0, 0, 440, 280).data];
});
await Bun.write(join(root, "store/promo-small-440x280.png"), rgbPng(new Uint8Array(pixels), 440, 280));
await browser.close();
