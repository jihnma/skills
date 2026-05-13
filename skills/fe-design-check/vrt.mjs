#!/usr/bin/env node
// fe-design-check VRT helper.
//   node vrt.mjs --figma-file=ID --figma-node=ID --story-url=URL --viewport=WxH
//                [--ratio-threshold=0.05] [--token-env=FIGMA_ACCESS_TOKEN] [--output=.fe-design-cache/diff]
// Exit: 0 pass, 1 fail (ratio over threshold), 2 setup error.
// devDeps (sharp, playwright, pixelmatch, pngjs) are resolved from process.cwd(),
// so install them in the project being verified — this script runs from any location.

import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const { values: args } = parseArgs({
  options: {
    "figma-file": { type: "string" },
    "figma-node": { type: "string" },
    "story-url": { type: "string" },
    "viewport": { type: "string" },
    "ratio-threshold": { type: "string" },
    "token-env": { type: "string" },
    "output": { type: "string" },
    "debug-selectors": { type: "string" },
  },
});
const die = (msg, code = 2) => { console.error(msg); process.exit(code); };

for (const k of ["figma-file", "figma-node", "story-url", "viewport"]) {
  if (!args[k]) die(`missing --${k}`);
}
const [vw, vh] = args.viewport.split("x").map((n) => Math.round(Number(n)));
const out = args.output ?? ".fe-design-cache/diff";
const ratioMax = Number(args["ratio-threshold"] ?? 0.05);
const token = process.env[args["token-env"] ?? "FIGMA_ACCESS_TOKEN"];
if (!token) die(`Figma token env var not set`);

// Resolve devDeps from cwd, not from this script's location. Mix of CJS (sharp,
// pngjs, playwright) and ESM (pixelmatch 7.x) — require.resolve + dynamic import
// handles both.
const userReq = createRequire(pathToFileURL(path.join(process.cwd(), "package.json")).href);
const load = async (name) => import(pathToFileURL(userReq.resolve(name)).href);
let sharp, pixelmatch, PNG, chromium;
try {
  sharp = (await load("sharp")).default;
  pixelmatch = (await load("pixelmatch")).default;
  const pngjsMod = await load("pngjs");
  PNG = pngjsMod.PNG ?? pngjsMod.default?.PNG;
  const pwMod = await load("playwright");
  chromium = pwMod.chromium ?? pwMod.default?.chromium;
} catch (e) {
  die(`devDeps not installed in ${process.cwd()}. Run:\n  pnpm add -D sharp playwright pixelmatch pngjs\n  pnpm approve-builds   # pnpm 11: approve sharp's native build\n  npx playwright install chromium\n\nUnderlying error: ${e.message}`);
}

await fs.mkdir(out, { recursive: true });
const figmaPng = path.join(out, "figma.png");
const codePng = path.join(out, "code.png");
const diffPng = path.join(out, "diff.png");

// Figma image at scale=2, flattened on white (transparent PNG vs white DOM = ~88% noise).
const meta = await fetch(
  `https://api.figma.com/v1/images/${args["figma-file"]}?ids=${args["figma-node"]}&format=png&scale=2`,
  { headers: { "X-Figma-Token": token } }
).then((r) => r.json());
const url = meta.images?.[args["figma-node"]];
if (!url) die(`Figma returned no image for node ${args["figma-node"]}`);
await sharp(Buffer.from(await fetch(url).then((r) => r.arrayBuffer())))
  .flatten({ background: "#ffffff" })
  .toFile(figmaPng);

// Storybook screenshot. Viewport = Figma frame size (integer); DSF=2 pairs with scale=2.
const debugSelectors = (args["debug-selectors"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
let debug = null;
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(args["story-url"], { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (debugSelectors.length) {
    debug = await page.evaluate((sels) => Object.fromEntries(sels.map((s) => {
      const el = document.querySelector(s);
      if (!el) return [s, null];
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return [s, {
        bbox: { x: r.x, y: r.y, w: r.width, h: r.height },
        style: { width: cs.width, height: cs.height, padding: cs.padding, margin: cs.margin, border: cs.border, boxSizing: cs.boxSizing },
      }];
    })), debugSelectors);
  }
  await page.screenshot({ path: codePng, animations: "disabled" });
} finally {
  await browser.close();
}

// Dim mismatch = wrong viewport or scale pairing. Refuse to silently normalize.
const a = PNG.sync.read(await fs.readFile(figmaPng));
const b = PNG.sync.read(await fs.readFile(codePng));
if (a.width !== b.width || a.height !== b.height) {
  die(`dimension mismatch: figma ${a.width}x${a.height} vs code ${b.width}x${b.height}`);
}

const diff = new PNG({ width: a.width, height: a.height });
const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
  threshold: 0.1,
  includeAA: false,
});
await fs.writeFile(diffPng, PNG.sync.write(diff));

const ratio = mismatched / (a.width * a.height);
const verdict = ratio < ratioMax ? "pass" : "fail";
console.log(JSON.stringify({
  verdict, ratio, ratioThreshold: ratioMax, mismatched,
  total: a.width * a.height,
  dimensions: { width: a.width, height: a.height },
  files: { figma: figmaPng, code: codePng, diff: diffPng },
  ...(debug ? { debug } : {}),
}, null, 2));
process.exit(verdict === "pass" ? 0 : 1);
