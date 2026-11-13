/** Renders src/assets/icon.svg to the PNG sizes the manifest needs. Needs a Chromium for playwright-core. */
import { join } from "node:path";
import { chromium } from "playwright-core";

const assets = join(import.meta.dir, "../src/assets");
const svg = await Bun.file(join(assets, "icon.svg")).text();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();

for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: join(assets, "icons", `icon-${size}.png`), omitBackground: true });
}
await browser.close();
